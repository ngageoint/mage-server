const util = require('util')
  , async = require('async')
  , archiver = require('archiver')
  , mgrs = require('mgrs')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , json2csv = require('json2csv')
  , Exporter = require('./exporter')
  , turfCentroid = require('@turf/centroid')
  , wkx = require('wkx')
  , attachmentBase = require('../environment/env').attachmentBaseDirectory;

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

      const observationStream = new stream.PassThrough();
      archive.append(observationStream, { name: 'observations.csv' });
      this.streamObservations(observationStream, archive, observationFields, err => {
        observationStream.end();
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
      log.info(err);
    }

    console.log('done writing csv, finalize archive');
    archive.finalize();
  });
};

Csv.prototype.streamObservations = function (stream, archive, fields, done) {
  this.requestObservations(this._filter, (err, observations) => {
    const json = this.flattenObservations(observations, archive);

    try {
      const csv = json2csv.parse(json, { fields });
      stream.write(csv);
      done();
    } catch (err) {
      done(err);
    }
  });
};

Csv.prototype.flattenObservations = function (observations, archive) {
  const event = this._event;
  const users = this._users;
  const devices = this._devices;

  const rows = [];

  observations
    .map(observation => observation.toObject())
    .forEach(observation => {
      const { forms: observationForms = [], ...observationRow } = observation.properties;
      observationRow.id = observation.id;

      if (users[observation.userId]) observationRow.user = users[observation.userId].username;
      if (devices[observation.deviceId]) observationRow.device = devices[observation.deviceId].uid;

      const centroid = turfCentroid(observation);
      observationRow.mgrs = mgrs.forward(centroid.geometry.coordinates);

      observationRow.shapeType = observation.geometry.type;
      if (observation.geometry.type === 'Point') {
        observationRow.longitude = observation.geometry.coordinates[0];
        observationRow.latitude = observation.geometry.coordinates[1];
      } else {
        observationRow.longitude = centroid.geometry.coordinates[0];
        observationRow.latitude = centroid.geometry.coordinates[1];
      }
      observationRow.wkt = wkx.Geometry.parseGeoJSON(observation.geometry).toWkt();

      observationRow.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))";

      rows.push(observationRow);

      observationForms.forEach(observationForm => {
        const formRow = { id: observation.id }
        const form = event.formMap[observationForm.formId];
        const formPrefix = event.forms.length > 1 ? form.name + '.' : '';
        for (const name in observationForm) {
          const field = form.fieldNameToField[name];
          if (field) {
            formRow[formPrefix + field.name] = observationForm[name];
            delete observationForm[name];
          }
        }

        rows.push(formRow);
      });

      observation.attachments.forEach((attachment, index) => {
        const name = path.basename(attachment.relativePath);
        rows.push({
          id: observation.id,
          attachment: attachment.name,
          attachmentExcelLink: excelLink(name, index)
        });

        archive.file(path.join(attachmentBase, attachment.relativePath), { name: name });
      });
    });

  return rows;
};

Csv.prototype.streamLocations = function (stream, done) {
  const startDate = this._filter.startDate ? moment(this._filter.startDate) : null;
  const endDate = this._filter.endDate ? moment(this._filter.endDate) : null;
  const cursor = this.requestLocations({ startDate: startDate, endDate: endDate, stream: true });

  const locations = [];
  cursor.eachAsync(async location => {
    locations.push(location);
  }).then(() => {
    if (cursor) cursor.close;
    this.flattenLocations(locations).forEach(location => {
      stream.push(location);
    });

    log.info('Successfully wrote ' + locations.length + ' locations to CSV');
    log.info('done writing locations');
    stream.push(null);
    done();
  }).catch(err => done(err));
};

Csv.prototype.flattenLocations = function (locations) {
  const users = this._users;
  const devices = this._devices;

  return locations.map(location => {
    const properties = location.properties;
    if (users[location.userId]) properties.user = users[location.userId].username;
    if (devices[properties.deviceId]) properties.device = devices[properties.deviceId].uid;

    properties.longitude = location.geometry.coordinates[0];
    properties.latitude = location.geometry.coordinates[1];
    properties.mgrs = mgrs.forward(location.geometry.coordinates);

    return properties;
  });
};
