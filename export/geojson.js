var util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , Exporter = require('./exporter')
  , geojson = require('../transformers/geojson')
  , attachmentBase = require('../environment/env').attachmentBaseDirectory;

function GeoJson(options) {
  GeoJson.super_.call(this, options);
}

util.inherits(GeoJson, Exporter);
module.exports = GeoJson;

GeoJson.prototype.export = function(streamable) {
  var self = this;

  streamable.type('application/zip');
  streamable.attachment("mage-geojson.zip");

  var archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    function(done) {
      if (!self._filter.exportObservations) return done();

      var observationStream = new stream.PassThrough();
      archive.append(observationStream, { name:'observations.geojson' });
      self.streamObservations(observationStream, archive, function(err) {
        observationStream.end();
        done(err);
      });
    },
    function(done) {
      if (!self._filter.exportLocations) return done();

      var locationStream = new stream.PassThrough();
      archive.append(locationStream, {name: 'locations.geojson'});
      self.streamLocations(locationStream, function(err) {
        locationStream.end();
        done(err);
      });
    }
  ],
  function(err) {
    if (err) {
      log.info(err);
    }

    archive.finalize();
  });
};

GeoJson.prototype.streamObservations = function(stream, archive, done) {
  var self = this;

  self._filter.states = ['active'];
  new api.Observation(self._event).getAll({filter: self._filter}, function(err, observations) {
    if (err) return err;

    self.mapObservations(observations);
    observations = observations.map(function(o) {
      return {
        geometry: o.geometry,
        properties: o.properties,
        attachments: o.attachments
      };
    });

    observations.forEach(function(o) {
      o.attachments = o.attachments.map(function(attachment) {
        return {
          name: attachment.name,
          relativePath: attachment.relativePath,
          size: attachment.size,
          contentType: attachment.contentType,
          width: attachment.width,
          height: attachment.height,
        };
      });

      o.attachments.forEach(function(attachment) {
        archive.file(path.join(attachmentBase, attachment.relativePath), {name: attachment.relativePath});
      });
    });

    stream.write(JSON.stringify({
      type: 'FeatureCollection',
      features: observations
    }));

    // throw in icons
    archive.directory(new api.Icon(self._event._id).getBasePath(), 'mage-export/icons', {date: new Date()});

    done();
  });
};

GeoJson.prototype.streamLocations = function(stream, done) {
  log.info('writing locations...');

  var self = this;
  var limit = 2000;

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
  var lastLocationId = null;

  stream.write('{"type": "FeatureCollection", "features": [');
  var locations = [];
  async.doUntil(function(done) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
      if (err) return done(err);

      locations = requestedLocations;

      if (locations.length) {
        if (lastLocationId) stream.write(",");  // not first time through

        var data = JSON.stringify(locations);
        stream.write(data.substr(1, data.length - 2));
      } else {
        stream.write(']}');
      }

      log.info('Successfully wrote ' + locations.length + ' locations to GeoJSON');
      var last = locations.slice(-1).pop();
      if (last) {
        var locationTime = moment(last.properties.timestamp);
        lastLocationId = last._id;
        if (!startDate || startDate.isBefore(locationTime)) {
          startDate = locationTime;
        }
      }

      done();
    });
  },
  function() {
    return locations.length === 0;
  },
  function(err) {
    log.info('done writing locations');
    done(err);
  });
};
