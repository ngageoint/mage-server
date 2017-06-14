var util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , shpwrite = require('shp-write')
  , shpgeojson = require('shp-write/src/geojson')
  , Exporter = require('./exporter');

function Shapefile(options) {
  Shapefile.super_.call(this, options);
}

util.inherits(Shapefile, Exporter);
module.exports = Shapefile;

Shapefile.prototype.export = function(stream) {
  var self = this;

  stream.type('application/zip');
  stream.attachment('mage-shapfile.zip');

  var archive = archiver('zip');
  archive.pipe(stream);

  async.parallel({
    events: function(done) {
      self.observationsToShapefile(archive, done);
    },
    locations: function(done) {
      self.locationsToShapefiles(archive, done);
    }
  }, function(err) {
    if (err) {
      log.error('Error streaming shapefile', err);
    }

    archive.finalize();
  });
};

Shapefile.prototype.observationsToShapefile = function(archive, done) {
  var self = this;

  if (!self._filter.exportObservations) return done(null, []);

  self._filter.states = ['active'];
  new api.Observation(self._event).getAll(self._filter, function(err, observations) {
    if (err) return done(err);

    self.mapObservations(observations);

    write(observations, function(err, files) {
      if (err) return done(err);

      archive.append(files.shp, {name: 'observations/observations'+files.shapeType+'.shp'});
      archive.append(files.shx, {name: 'observations/observations'+files.shapeType+'.shx'});
      archive.append(files.dbf, {name: 'observations/observations'+files.shapeType+'.dbf'});
      archive.append(files.prj, {name: 'observations/observations'+files.shapeType+'.prj'});
    }, done);
  });
};


Shapefile.prototype.locationsToShapefiles = function(archive, done) {
  var self = this;

  if (!self._filter.exportLocations) return done(null, []);

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
  var lastLocationId = null;

  var locations = [];
  async.doUntil(function(done) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId}, function(err, requestedLocations) {
      if (err) return done(err);

      locations = requestedLocations;

      log.info('got some locations ' + locations.length);

      locations.forEach(function(l) {
        if (self._users[l.properties.user]) l.properties.user = self._users[l.properties.user].username;
        if (self._users[l.properties.deviceId]) l.properties.device = self._users[l.properties.deviceId].uid;

        delete l.properties.deviceId;
      });

      var first = locations.slice(0).pop();
      var last = locations.slice(-1).pop();
      if (last) {
        var interval = moment(first.properties.timestamp).toISOString() + '_' + moment(last.properties.timestamp).toISOString();
        write(locations, function(err, files) {
          if (err) return done(err);

          archive.append(files.shp, {name: 'locations/' + interval + '.shp'});
          archive.append(files.shx, {name: 'locations/' + interval + '.shx'});
          archive.append(files.dbf, {name: 'locations/' + interval + '.dbf'});
          archive.append(files.prj, {name: 'locations/' + interval + '.prj'});

          log.info('Successfully wrote ' + locations.length + ' locations to SHAPEFILE');

          var locationTime = moment(last.properties.timestamp);
          lastLocationId = last._id;
          if (!startDate || startDate.isBefore(locationTime)) {
            startDate = locationTime;
          }

        }, done);
      } else {
        done();
      }
    });
  },
  function() {
    return locations.length === 0;
  },
  function(err) {
    log.info('done writing all locations for to SHAPEFILE', err);

    done(err);
  });
};

function write(geojson, callback, doneCallback) {
  var gj = {
    features: geojson
  };
  [shpgeojson.polygon(gj), shpgeojson.point(gj), shpgeojson.line(gj)]
    .forEach(function(l) {
      if (l.geometries.length && l.geometries[0].length) {
        shpwrite.write(l.properties, l.type, l.geometries,
          function(err, files) {
            callback(err, {
              shapeType: l.type,
              shp: new Buffer(new Uint8Array(files.shp.buffer)),
              shx: new Buffer(new Uint8Array(files.shx.buffer)),
              dbf: new Buffer(new Uint8Array(files.dbf.buffer)),
              prj: files.prj
            });
          }
        );
      }
  });
  doneCallback();
}
