'use strict';

const util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , mgrs = require('mgrs')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , Exporter = require('./exporter')
  , attachmentBase = require('../environment/env').attachmentBaseDirectory
  , User = require('../models/user')
  , Device = require('../models/device')
  , { default: turfCentroid } = require('@turf/centroid');

function GeoJson(options) {
  GeoJson.super_.call(this, options);
}

util.inherits(GeoJson, Exporter);
module.exports = GeoJson;

GeoJson.prototype.export = function (streamable) {
  const archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    done => {
      if (!this._filter.exportObservations) return done();

      const observationStream = new stream.PassThrough();
      archive.append(observationStream, { name: 'observations.geojson' });
      this.streamObservations(observationStream, archive, err => {
        observationStream.end();
        done(err);
      });
    },
    done => {
      if (!this._filter.exportLocations) return done();

      const locationStream = new stream.PassThrough();
      archive.append(locationStream, { name: 'locations.geojson' });
      this.streamLocations(locationStream, err => {
        locationStream.end();
        done(err);
      });
    }
  ],
    err => {
      if (err) log.warn(err);
      archive.finalize();
    });
};

GeoJson.prototype.mapObservationProperties = function (observation, archive) {
  observation.properties = observation.properties || {};
  observation.properties.timestamp = moment(observation.properties.timestamp).toISOString();

  const centroid = turfCentroid(observation);
  observation.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

  if (observation.properties.forms) {
    observation.properties.forms.forEach(observationForm => {
      if (Object.keys(observationForm).length === 0) return;

      const form = this._event.formMap[observationForm.formId];
      const formProperties = observation.properties[form.name] || [];
      const properties = Object.fromEntries(form.fields
        .filter(field => !field.archived && field.type !== 'password' && field.type !== 'geometry')
        .filter(field => {
          let hasValue = false;
          switch (field.type) {
            case 'attachment': {
              hasValue = observation.attachments.some(attachment => {
                return attachment.fieldName === field.name &&
                  attachment.observationFormId.toString() === observationForm._id.toString();
              });

              break;
            }
            case 'checkbox': {
              hasValue = field.value != null
            }
            default: {
              hasValue = observationForm[field.name]
            }
          }

          return hasValue;
        })
        .sort((a, b) => a.id - b.id)
        .map(field => {
          let value = observationForm[field.name];
          if (field.type === 'attachment') {
            value = observation.attachments.filter(attachment => {
              return attachment.relativePath && attachment.fieldName === field.name &&
                attachment.observationFormId.toString() === observationForm._id.toString();
            })
            .map(attachment => {
              return attachment.relativePath
            });
            value.forEach(attachmentPath => {
              archive.file(path.join(attachmentBase, attachmentPath), { name: attachmentPath });
            });
          }

          return [field.title, value];
        }));

      formProperties.push(properties);
      observation.properties[form.name] = formProperties;
    });
  }

  delete observation.properties.forms;

  observation.properties.id = observation._id;
}

GeoJson.prototype.streamObservations = async function (stream, archive, done) {
  log.info("Requesting observations from DB");

  const cursor = this.requestObservations(this._filter);

  let user = null;
  let device = null;

  let numObservations = 0;

  stream.write('{"type": "FeatureCollection", "features": [');
  cursor.eachAsync(async observation => {
    if (numObservations > 0) {
      stream.write(',');
    }

    this.mapObservationProperties(observation, archive);

    if (!user || user._id.toString() !== observation.userId.toString()) {
      user = await User.getUserById(observation.userId);
    }
    if (!device || device._id.toString() !== observation.deviceId.toString()) {
      device = await Device.getDeviceById(observation.deviceId);
    }

    if (user) observation.properties.user = user.username;
    if (device) observation.properties.device = device.uid;

    const data = JSON.stringify({
      geometry: observation.geometry,
      properties: observation.properties
    });
    stream.write(data);
    numObservations++;
  }).then(() => {
    if (cursor) cursor.close;

    stream.write(']}');

    // throw in icons
    archive.directory(new api.Icon(this._event._id).getBasePath(), 'mage-export/icons', { date: new Date() });

    log.info('Successfully wrote ' + numObservations + ' observations to GeoJSON');

    done();
  }).catch(err => done(err));
};

GeoJson.prototype.streamLocations = function (stream, done) {
  log.info('Requesting locations from DB');

  const startDate = this._filter.startDate ? moment(this._filter.startDate) : null;
  const endDate = this._filter.endDate ? moment(this._filter.endDate) : null;

  const cursor = this.requestLocations({ startDate: startDate, endDate: endDate });

  let numLocations = 0;

  stream.write('{"type": "FeatureCollection", "features": [');
  cursor.eachAsync(location => {
    if (numLocations > 0) {
      stream.write(',');
    }

    const centroid = turfCentroid(location);
    location.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

    const data = JSON.stringify(location);
    stream.write(data);
    numLocations++;
  }).then(() => {
    if (cursor) cursor.close;

    stream.write(']}');

    log.info('Successfully wrote ' + numLocations + ' locations to GeoJSON');

    done();
  }).catch(err => done(err));
};
