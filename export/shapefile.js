var util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , shpwrite = require('shp-write')
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

      archive.append(files.shp, {name: 'observations/observations.shp'});
      archive.append(files.shx, {name: 'observations/observations.shx'});
      archive.append(files.dbf, {name: 'observations/observations.dbf'});
      archive.append(files.prj, {name: 'observations/observations.prj'});
      done();
    });
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

      var first = locations.slice(1).pop();
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

          done();
        });
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

function justPoints(geojson) {
  return {
    type: 'POINT',
    geometries: geojson.map(justCoords),
    properties: geojson.map(justProps)
  };
}

function justCoords(t) {
  if (t.geometry.coordinates[0] !== undefined &&
      t.geometry.coordinates[0][0] !== undefined &&
      t.geometry.coordinates[0][0][0] !== undefined) {
    return t.geometry.coordinates[0];
  } else {
    return t.geometry.coordinates;
  }
}

function justProps(geojson) {
  return geojson.properties;
}

function write(geojson, callback) {
  var points = justPoints(geojson);
  shpwrite.write(points.properties, 'POINT', points.geometries, function(err, files) {
    if (err) return callback(err);

    callback(err, {
      shp: new Buffer(new Uint8Array(files.shp.buffer)),
      shx: new Buffer(new Uint8Array(files.shx.buffer)),
      dbf: new Buffer(new Uint8Array(files.dbf.buffer)),
      prj: files.prj
    });
  });
}
