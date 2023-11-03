'use strict';

const util = require('util')
  , async = require('async')
  , archiver = require('archiver')
  , mgrs = require('mgrs')
  , moment = require('moment')
  , log = require('winston')
  , path = require('path')
  , json2csv = require('json2csv')
  , Exporter = require('./exporter')
  , { default: turfCentroid } = require('@turf/centroid')
  , wkx = require('wkx')
  , attachmentBase = require('../environment/env').attachmentBaseDirectory
  , User = require('../models/user')
  , Device = require('../models/device');

function Csv(options) {
  Csv.super_.call(this, options);
}

util.inherits(Csv, Exporter);
module.exports = Csv;

function excelLink(attachmentName, attachmentNumber) {
  return `=HYPERLINK("${attachmentName}", "attachment${attachmentNumber}")`;
}

Csv.prototype.export = function (streamable) {
  const observationFields = [{
    label: 'id',
    value: 'id'
  }, {
    label: 'User',
    value: 'user'
  }, {
    label: 'Device',
    value: 'device'
  }, {
    label: 'Shape Type',
    value: 'shapeType'
  }, {
    label: 'Latitude',
    value: 'latitude'
  }, {
    label: 'Longitude',
    value: 'longitude'
  }, {
    label: 'MGRS',
    value: 'mgrs'
  }, {
    label: 'Date (ISO8601)',
    value: 'timestamp'
  }, {
    label: 'Excel Timestamp (UTC)',
    value: 'excelTimestamp'
  }, {
    label: 'Well Known Text',
    value: 'wkt'
  }, {
    label: 'Location Provider',
    value: 'provider'
  }, {
    label: 'Location Accuracy +/- (meters)',
    value: 'accuracy'
  }];

  this._event.forms
    .filter(form => !form.archived)
    .forEach(form => {
      const formPrefix = this._event.forms.length > 1 ? form.name + '.' : '';

      form.fields
        .filter(field => !field.archived)
        .sort((a, b) => a.id - b.id)
        .filter(field => field.type !== 'attachment')
        .forEach(field => {
          observationFields.push({
            label: formPrefix + field.title,
            value: formPrefix + field.name
          });
        });
    });

  observationFields.push({
    label: 'Attachment',
    value: 'attachment'
  });

  observationFields.push({
    label: 'Attachment Excel Link',
    value: 'attachmentExcelLink'
  });

  const locationFields = [
    'user',
    'timestamp',
    'latitude',
    'longitude',
    'altitude',
    'provider',
    'mgrs',
    'accuracy',
    'speed',
    'bearing',
    'battery_level',
    'device'
  ];

  const archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    done => {
      if (!this._filter.exportObservations) return done();

      const asyncParser = new json2csv.AsyncParser({ fields: observationFields }, { readableObjectMode: true, writableObjectMode: true });
      archive.append(asyncParser.processor, { name: 'observations.csv' });
      this.streamObservations(asyncParser.input, archive, err => {
        done(err);
      });
    },
    done => {
      if (!this._filter.exportLocations) return done();

      const asyncParser = new json2csv.AsyncParser({ fields: locationFields }, { readableObjectMode: true, writableObjectMode: true });
      archive.append(asyncParser.processor, { name: 'locations.csv' });
      this.streamLocations(asyncParser.input, err => {
        done(err);
      });
    }
  ],
    err => {
      if (err) {
        log.warn(err);
      }

      log.info('done writing csv, finalize archive');
      archive.finalize();
    });
};

Csv.prototype.streamObservations = async function (stream, archive, done) {
  log.info("Retrieving observations from DB");
  const cursor = this.requestObservations(this._filter);

  let cache = {
    user: null,
    device: null
  }

  let numObservations = 0;
  cursor.eachAsync(async observation => {
    const properties = await this.flattenObservation(observation, cache, archive);
    stream.push(properties);
    numObservations++;
  }).then(() => {
    if (cursor) cursor.close;

    log.info('Successfully wrote ' + numObservations + ' observations to CSV');
    log.info('done writing observations');
    stream.push(null);
    done();
  }).catch(err => done(err));
};

Csv.prototype.flattenObservation = async function (observation, cache, archive) {
  const properties = observation.properties;
  properties.id = observation.id;

  if (!cache.user || cache.user._id.toString() !== observation.userId.toString()) {
    cache.user = await User.getUserById(observation.userId);
  }
  if (!cache.device || cache.device._id.toString() !== observation.deviceId.toString()) {
    cache.device = await Device.getDeviceById(observation.deviceId);
  }

  if (cache.user) properties.user = cache.user.username;
  if (cache.device) properties.device = cache.device.uid;

  const centroid = turfCentroid(observation);
  properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

  properties.shapeType = observation.geometry.type;
  if (observation.geometry.type === 'Point') {
    properties.longitude = observation.geometry.coordinates[0];
    properties.latitude = observation.geometry.coordinates[1];
  } else {
    properties.longitude = centroid.geometry.coordinates[0];
    properties.latitude = centroid.geometry.coordinates[1];
  }
  properties.wkt = wkx.Geometry.parseGeoJSON(observation.geometry).toWkt();

  properties.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))";

  if (observation.properties && observation.properties.forms) {
    observation.properties.forms.forEach(observationForm => {
      const form = this._event.formMap[observationForm.formId];
      const formPrefix = this._event.forms.length > 1 ? form.name + '.' : '';
      for (const name in observationForm) {
        const field = form.fieldNameToField[name];
        if (field) {
          properties[formPrefix + field.name] = observationForm[name];
          delete observationForm[name];
        }
      }
    });
  }

  if (observation.attachments) {
    observation.attachments.filter(attachment => {
      // exclude attachments that are pending upload and/or not saved
      return attachment.relativePath
    })
    .forEach((attachment, index) => {
      const name = path.basename(attachment.relativePath);
      properties.attachment = attachment.name;
      properties.attachmentExcelLink = excelLink(name, index);
      archive.file(path.join(attachmentBase, attachment.relativePath), { name });
    });
  }

  return properties;
};

Csv.prototype.streamLocations = async function (stream, done) {
  const startDate = this._filter.startDate ? moment(this._filter.startDate) : null;
  const endDate = this._filter.endDate ? moment(this._filter.endDate) : null;

  log.info("Retrieving locations from DB");
  const cursor = this.requestLocations({ startDate: startDate, endDate: endDate });

  let cache = {
    user: null,
    device: null
  }

  let numLocations = 0;
  cursor.eachAsync(async location => {
    const properties = await this.flattenLocation(location, cache);
    stream.push(properties);
    numLocations++;
  }).then(() => {
    if (cursor) cursor.close;

    log.info('Successfully wrote ' + numLocations + ' locations to CSV');
    log.info('done writing locations');
    stream.push(null);
    done();
  }).catch(err => done(err));
};

Csv.prototype.flattenLocation = async function (location, cache) {
  log.debug('Flattening location ' + location._id.toString());
  const properties = location.properties;

  if (!cache.user || cache.user._id.toString() !== location.userId.toString()) {
    cache.user = await User.getUserById(location.userId);
  }
  if (!cache.device || cache.device._id.toString() !== properties.deviceId.toString()) {
    cache.device = await Device.getDeviceById(properties.deviceId);
  }

  if (cache.user) properties.user = cache.user.username;
  if (cache.device) properties.device = cache.device.uid;

  properties.longitude = location.geometry.coordinates[0];
  properties.latitude = location.geometry.coordinates[1];
  properties.mgrs = mgrs.forward(location.geometry.coordinates);

  return properties;
};
