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

function excelLink(attachment, attachmentNumber) {
  return '=HYPERLINK("' + attachment.name + '", "attachment' + attachmentNumber + '")';
}

Csv.prototype.export = function(streamable) {
  var self = this;

  streamable.type('application/zip');
  streamable.attachment('mage-csv.zip');

  const observationFields = [{
    label: 'id',
    value: 'id'
  },{
    label: 'User',
    value: 'user'
  },{
    label: 'Device',
    value: 'device'
  },{
    label: 'Shape Type',
    value: 'shapeType'
  },{
    label: 'Latitude',
    value: 'latitude'
  },{
    label: 'Longitude',
    value: 'longitude'
  },{
    label: 'MGRS',
    value: 'mgrs'
  },{
    label: 'Date (ISO8601)',
    value: 'timestamp'
  },{
    label: 'excelTimestamp',
    value: 'Excel Timestamp (UTC)'
  },{
    label: 'wkt',
    value: 'Well Known Text'
  }, {
    label: 'Location Provider',
    value: 'provider'
  }, {
    label: 'Location Accuracy +/- (meters)',
    value: 'accuracy'
  }];

  self._event.forms
    .filter(form => !form.archived)
    .forEach(function(form) {
      var formPrefix = self._event.forms.length > 1 ? form.name + '.' : '';

      form.fields
        .filter(field => !field.archived)
        .sort((a, b) => a.id - b.id)
        .forEach(function(field) {
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

  streamable.type('application/zip');
  streamable.attachment("mage-export-csv.zip");

  var archive = archiver('zip');
  archive.pipe(streamable);

  async.parallel([
    function(done) {
      if (!self._filter.exportObservations) return done();

      var observationStream = new stream.PassThrough();
      archive.append(observationStream, { name:'observations.csv' });
      self.streamObservations(observationStream, archive, observationFields, function(err) {
        observationStream.end();
        done(err);
      });
    },
    function(done) {
      if (!self._filter.exportLocations) return done();

      const asyncParser = new json2csv.AsyncParser({ fields: locationFields }, { readableObjectMode: true, writableObjectMode: true });
      archive.append(asyncParser.processor, {name: 'locations.csv'});
      self.streamLocations(asyncParser.input, function(err) {
        done(err);
      });
    }
  ],
  function(err) {
    if (err) {
      log.info(err);
    }

    console.log('done writing csv, finalize archive');
    archive.finalize();
  });
};

Csv.prototype.streamObservations = function(stream, archive, fields, done) {
  var self = this;
  self.requestObservations(self._filter, function(err, observations) {
    var json = self.flattenObservations(observations, archive);

    try {
      const csv = json2csv.parse(json, {fields});
      stream.write(csv);
      done();
    } catch (err) {
      done(err);
    }
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
      var formPrefix = event.forms.length > 1 ? form.name + '.' : '';
      for (var name in observationForm) {
        var field = form.fieldNameToField[name];
        if (field) {
          properties[formPrefix + field.name] = observationForm[name];
          delete observationForm[name];
        }
      }
    });
    delete properties.forms;

    if (users[observation.userId]) properties.user = users[observation.userId].username;
    if (devices[observation.deviceId]) properties.device = devices[observation.deviceId].uid;

    var centroid = turfCentroid(observation);
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
  var self = this;
  var limit = 2000;

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
  var lastLocationId = null;

  var locations = [];

  async.doUntil(function(done) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
      if (err) return done(err);
      locations = requestedLocations;

      self.flattenLocations(locations).forEach(location => {
        stream.push(location);
      });

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
    stream.push(null);
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
    properties.mgrs = mgrs.forward(location.geometry.coordinates);

    return properties;
  });
};
