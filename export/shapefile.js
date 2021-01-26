const util = require('util')
  , async = require('async')
  , archiver = require('archiver')
  , mgrs = require('mgrs')
  , moment = require('moment')
  , log = require('winston')
  , shpwrite = require('shp-write')
  , shpgeojson = require('shp-write/src/geojson')
  , Exporter = require('./exporter')
  , turfCentroid = require('@turf/centroid');

function Shapefile(options) {
  Shapefile.super_.call(this, options);
}

util.inherits(Shapefile, Exporter);
module.exports = Shapefile;

Shapefile.prototype.export = function (stream) {
  const self = this;

  stream.type('application/zip');
  stream.attachment('mage-shapefile.zip');

  const archive = archiver('zip');
  archive.pipe(stream);

  async.parallel({
    events: function (done) {
      self.observationsToShapefile(archive, done);
    },
    locations: function (done) {
      self.locationsToShapefiles(archive, done);
    }
  }, function (err) {
    if (err) {
      log.error('Error streaming shapefile', err);
    }

    archive.finalize();
  });
};

Shapefile.prototype.observationsToShapefile = function (archive, done) {
  const self = this;

  if (!self._filter.exportObservations) return done(null, []);

  self.requestObservations(self._filter, function (err, observations) {
    if (err) return done(err);

    mapObservations.call(self, observations);

    write(observations, function (err, files) {
      if (err) return done(err);

      archive.append(files.shp, { name: 'observations/observations' + files.shapeType + '.shp' });
      archive.append(files.shx, { name: 'observations/observations' + files.shapeType + '.shx' });
      archive.append(files.dbf, { name: 'observations/observations' + files.shapeType + '.dbf' });
      archive.append(files.prj, { name: 'observations/observations' + files.shapeType + '.prj' });
    }, done);
  });
};

Shapefile.prototype.locationsToShapefiles = function (archive, done) {
  const self = this;

  if (!self._filter.exportLocations) return done(null, []);

  const startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  const endDate = self._filter.endDate ? moment(self._filter.endDate) : null;

  const cursor = self.requestLocations({ startDate: startDate, endDate: endDate, stream: true });

  let locations = [];
  cursor.eachAsync(async function (location, i) {
    if (self._users[location.properties.user]) location.properties.user = self._users[location.properties.user].username;
    if (self._users[location.properties.deviceId]) location.properties.device = self._users[location.properties.deviceId].uid;

    const centroid = turfCentroid(location);
    location.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

    delete location.properties.deviceId;
    locations.push(location);
  }).then(() => {
    if (cursor) cursor.close;

    const first = locations.slice(0).pop();
    const last = locations.slice(-1).pop();
    if (last) {
      const interval = moment(first.properties.timestamp).toISOString() + '_' + moment(last.properties.timestamp).toISOString();
      write(locations, function (err, files) {
        if (err) return done(err);

        archive.append(files.shp, { name: 'locations/' + interval + '.shp' });
        archive.append(files.shx, { name: 'locations/' + interval + '.shx' });
        archive.append(files.dbf, { name: 'locations/' + interval + '.dbf' });
        archive.append(files.prj, { name: 'locations/' + interval + '.prj' });

        log.info('Successfully wrote ' + locations.length + ' locations to SHAPEFILE');
      }, done);
    } else {
      done();
    }
  }).catch(err => {
    done(err);
  });
};

function write(geojson, callback, doneCallback) {
  const gj = {
    features: geojson
  };
  [shpgeojson.polygon(gj), shpgeojson.point(gj), shpgeojson.line(gj)]
    .forEach(function (l) {
      console.log('type', l.type);
      console.log('geometries', l.geometries);
      console.log('properties', l.properties);
      if (l.geometries.length && l.geometries[0].length) {
        console.log('write type', l.type);
        shpwrite.write(l.properties, l.type, l.geometries,
          function (err, files) {
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

function mapObservationProperties(observation) {
  const event = this._event;

  observation.properties = observation.properties || {};
  observation.properties.timestamp = moment(observation.properties.timestamp).toISOString();

  const centroid = turfCentroid(observation);
  observation.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

  observation.properties.forms.forEach(function (observationForm) {
    if (Object.keys(observationForm).length === 0) return;

    const form = event.formMap[observationForm.formId];
    for (let name in observationForm) {
      const field = form.fieldNameToField[name];
      if (field && !field.archived) {
        // Shapfiles attribute column names don't allow more than 10 characters
        // Lets try to shorten the properties field names by using form id instead of form name
        observation.properties[form.id + "_" + field.title] = observationForm[name];
        delete observation.properties[name];
      }
    }
  });

  delete observation.properties.forms;

  observation.properties.id = observation._id;
}

function mapObservations(observations) {
  const self = this;

  if (!Array.isArray(observations)) observations = [observations];

  observations.forEach(function (o) {
    mapObservationProperties.call(self, o);

    if (self._users[o.userId]) o.properties.user = self._users[o.userId].username;
    if (self._devices[o.deviceId]) o.properties.device = self._devices[o.deviceId].uid;

    delete o.deviceId;
    delete o.userId;
  });
}
