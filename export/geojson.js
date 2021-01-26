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
  , turfCentroid = require('@turf/centroid')
  , attachmentBase = require('../environment/env').attachmentBaseDirectory;

function GeoJson(options) {
  GeoJson.super_.call(this, options);
}

util.inherits(GeoJson, Exporter);
module.exports = GeoJson;

GeoJson.prototype.export = function (streamable) {
  const self = this;

  streamable.type('application/zip');
  streamable.attachment("mage-geojson.zip");

  const archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    function (done) {
      if (!self._filter.exportObservations) return done();

      const observationStream = new stream.PassThrough();
      archive.append(observationStream, { name: 'observations.geojson' });
      self.streamObservations(observationStream, archive, function (err) {
        observationStream.end();
        done(err);
      });
    },
    function (done) {
      if (!self._filter.exportLocations) return done();

      const locationStream = new stream.PassThrough();
      archive.append(locationStream, { name: 'locations.geojson' });
      self.streamLocations(locationStream, function (err) {
        locationStream.end();
        done(err);
      });
    }
  ],
    function (err) {
      if (err) {
        log.info(err);
      }

      archive.finalize();
    });
};

GeoJson.prototype.streamObservations = function (stream, archive, done) {
  const self = this;
  self.requestObservations(self._filter, function (err, observations) {
    if (err) return err;

    self.mapObservations(observations);
    observations = observations.map(function (o) {
      return {
        geometry: o.geometry,
        properties: o.properties,
        attachments: o.attachments
      };
    });

    observations.forEach(function (o) {
      o.attachments = o.attachments.map(function (attachment) {
        return {
          name: attachment.name,
          relativePath: attachment.relativePath,
          size: attachment.size,
          contentType: attachment.contentType,
          width: attachment.width,
          height: attachment.height,
        };
      });

      o.attachments.forEach(function (attachment) {
        archive.file(path.join(attachmentBase, attachment.relativePath), { name: attachment.relativePath });
      });
    });

    stream.write(JSON.stringify({
      type: 'FeatureCollection',
      features: observations
    }));

    // throw in icons
    archive.directory(new api.Icon(self._event._id).getBasePath(), 'mage-export/icons', { date: new Date() });

    done();
  });
};

GeoJson.prototype.streamLocations = function (stream, done) {
  log.info('writing locations...');

  const self = this;

  const startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  const endDate = self._filter.endDate ? moment(self._filter.endDate) : null;

  const cursor = self.requestLocations({ startDate: startDate, endDate: endDate, stream: true });

  let locations = [];

  stream.write('{"type": "FeatureCollection", "features": [');
  cursor.eachAsync(async function (location, i) {
    const centroid = turfCentroid(location);
    location.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);
    locations.push(location);
  }).then(() => {
    if (cursor) cursor.close;

    if (locations.length > 0) {
      const data = JSON.stringify(locations);
      stream.write(data.substr(1, data.length - 2));
    } else {
      stream.write(']}');
    }

    log.info('Successfully wrote ' + locations.length + ' locations to GeoJSON');

    done();
  }).catch(err => {
    done(err);
  });
};
