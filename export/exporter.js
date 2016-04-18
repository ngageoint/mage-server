var moment = require('moment')
  , Location = require('../models/location');

function Exporter(options) {
  this._event = options.event;
  this._users = options.users;
  this._devices = options.devices;
  this._filter = options.filter;
}

function mapObservationProperties(observation, form) {
  observation.properties = observation.properties || {};
  for (var name in observation.properties) {
    if (name === 'type') continue;

    if (name === 'timestamp') {
      observation.properties.timestamp = moment(observation.properties.timestamp).toISOString();
    }

    var field = form.fieldNameToField[name];
    if (field) {
      observation.properties[field.title] = observation.properties[name];
      delete observation.properties[name];
    }
  }

  observation.properties.id = observation._id;
}

Exporter.prototype.mapObservations = function(observations) {
  var self = this;

  if (!Array.isArray(observations)) observations = [observations];

  observations.forEach(function(o) {
    mapObservationProperties(o, self._event.form);

    if (self._users[o.userId]) o.properties.user = self._users[o.userId].username;
    if (self._devices[o.deviceId]) o.properties.device = self._devices[o.deviceId].uid;

    delete o.deviceId;
    delete o.userId;
  });
};

Exporter.prototype.requestLocations = function(options, done) {
  var filter = {
    eventId: this._event._id
  };

  if (options.userId) filter.userId = options.userId;
  if (options.lastLocationId) filter.lastLocationId = options.lastLocationId;
  if (options.startDate) filter.startDate = options.startDate.toDate();
  if (options.endDate) filter.endDate = options.endDate.toDate();

  Location.getLocations({filter: filter, limit: options.limit}, function(err, locations) {
    if(err) return done(err);
    done(null, locations);
  });
};

module.exports = Exporter;
