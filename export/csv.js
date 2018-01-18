var util = require('util')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , json2csv = require('json2csv')
  , json2csvStream = require('json2csv-stream')
  , Exporter = require('./exporter')
  , turfCentroid = require('@turf/centroid')
  , wkx = require('wkx')
  , attachmentBase = require('environment').attachmentBaseDirectory;

function Csv(options) {
  Csv.super_.call(this, options);
}

util.inherits(Csv, Exporter);
module.exports = Csv;

function excelLink(attachment, attachmentNumber) {
  return '=HYPERLINK("' + attachment.name + '", "attachment' + attachmentNumber + '")';
}

Csv.prototype.export = function(streamable) {
  var self = this;

  streamable.type('application/zip');
  streamable.attachment('mage-csv.zip');

  var fields = ['id', 'user', 'device', 'shapeType', 'latitude', 'longitude', 'timestamp', 'excelTimestamp', 'wkt'];
  var fieldNames = ['id', 'User', 'Device', 'Shape Type', 'Latitude', 'Longitude', 'Date (ISO8601)', 'Excel Timestamp (UTC)', 'Well Known Text'];

  self._event.forms.forEach(function(form) {
    form.fields.forEach(function(field) {
      if (field.archived) return;

      fields.push(form.name + '.' + field.name);
      fieldNames.push(form.name + '.' + field.title);
    });
  });

  fields.push('attachment');
  fieldNames.push('Attachment');

  fields.push('attachmentExcelLink');
  fieldNames.push('Attachment Excel Link');

  streamable.type('application/zip');
  streamable.attachment("mage-export-csv.zip");

  var archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    function(done) {
      if (!self._filter.exportObservations) return done();

      var observationStream = new stream.PassThrough();
      archive.append(observationStream, { name:'observations.csv' });
      self.streamObservations(observationStream, archive, fields, fieldNames, function(err) {
        observationStream.end();
        done(err);
      });
    },
    function(done) {
      if (!self._filter.exportLocations) return done();

      var locationStream = new json2csvStream({
        keys: ['user', 'device', 'timestamp', 'latitude', 'longitude', 'accuracy', 'bearing', 'speed', 'altitude']
      });
      archive.append(locationStream, {name: 'locations.csv'});
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

Csv.prototype.streamObservations = function(stream, archive, fields, fieldNames, done) {
  var self = this;

  self._filter.states = ['active'];
  new api.Observation(self._event).getAll({filter: self._filter}, function(err, observations) {
    var data = self.flattenObservations(observations, archive);

    json2csv({data: data, fields: fields, fieldNames: fieldNames}, function(err, csv) {
      if (err) return done(err);

      stream.write(csv);
      done();
    });
  });
};

Csv.prototype.flattenObservations = function(observations, archive) {
  var event = this._event;
  var users = this._users;
  var devices = this._devices;

  var flattened = [];

  observations.forEach(function(observation) {
    var properties = observation.properties;
    properties.id = observation.id;

    properties.forms.forEach(function(observationForm) {
      var form = event.formMap[observationForm.formId];
      for (var name in observationForm) {
        var field = form.fieldNameToField[name];
        if (field) {
          properties[form.name + "." + field.name] = observationForm[name];
          delete observationForm[name];
        }
      }
    });
    delete properties.forms;

    if (users[observation.userId]) properties.user = users[observation.userId].username;
    if (devices[observation.deviceId]) properties.device = devices[observation.deviceId].uid;

    properties.shapeType = observation.geometry.type;
    if (observation.geometry.type === 'Point') {
      properties.longitude = observation.geometry.coordinates[0];
      properties.latitude = observation.geometry.coordinates[1];
    } else {
      var centroid = turfCentroid(observation);
      properties.longitude = centroid.geometry.coordinates[0];
      properties.latitude = centroid.geometry.coordinates[1];
    }
    properties.wkt = wkx.Geometry.parseGeoJSON(observation.geometry).toWkt();

    properties.excelTimestamp = "=DATEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),1,10)) + TIMEVALUE(MID(INDIRECT(ADDRESS(ROW(),COLUMN()-1)),12,8))";

    if (observation.attachments.length > 0) {
      properties.attachment = observation.attachments[0].name;
      properties.attachmentExcelLink = excelLink(observation.attachments[0], 1);
      archive.file(path.join(attachmentBase, observation.attachments[0].relativePath), {name: observation.attachments[0].name});
    }

    flattened.push(properties);

    for (var i = 1; i < observation.attachments.length; i++) {
      var attachment = observation.attachments[i];

      flattened.push({
        id: observation.id,
        attachment: attachment.name,
        attachmentExcelLink: excelLink(attachment, i + 1)
      });

      archive.file(path.join(attachmentBase, attachment.relativePath), {name: attachment.relativePath});
    }
  });

  return flattened;
};

Csv.prototype.streamLocations = function(stream, done) {
  log.info('writing locations...');

  var self = this;
  var limit = 2000;

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
  var lastLocationId = null;

  var locations = [];
  stream.write('[');

  async.doUntil(function(done) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
      if (err) return done(err);
      locations = requestedLocations;

      if (locations.length) {
        if (lastLocationId) {
          stream.write(",");  // not first time through
        }

        var data = JSON.stringify(self.flattenLocations(locations));
        stream.write(data.substr(1, data.length - 2));
      } else {
        stream.write(']');
      }

      log.info('Successfully wrote ' + locations.length + ' locations to CSV');
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

Csv.prototype.flattenLocations = function(locations) {
  var users = this._users;
  var devices = this._devices;

  return locations.map(function(location) {
    var properties = location.properties;
    if (users[location.userId]) properties.user = users[location.userId].username;
    if (devices[properties.deviceId]) properties.device = devices[properties.deviceId].uid;

    properties.longitude = location.geometry.coordinates[0];
    properties.latitude = location.geometry.coordinates[1];

    return properties;
  });
};
