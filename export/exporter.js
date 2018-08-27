const mgrs = require('mgrs')
  , moment = require('moment')
  , turfCentroid = require('@turf/centroid')
  , Location = require('../models/location');

function Exporter(options) {
  this._event = options.event;
  this._users = options.users;
  this._devices = options.devices;
  this._filter = options.filter;
}

function mapObservationProperties(observation, event) {
  observation.properties = observation.properties || {};
  observation.properties.timestamp = moment(observation.properties.timestamp).toISOString();

  var centroid = turfCentroid(observation);
  observation.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);

  observation.properties.forms.forEach(function(observationForm) {
    if (Object.keys(observationForm).length === 0) return;

    var form = event.formMap[observationForm.formId];
    var formPrefix = event.forms.length > 1 ? form.name + '.' : '';

    for (var name in observationForm) {
      var field = form.fieldNameToField[name];
      if (field && !field.archived) {
        observation.properties[formPrefix + field.title] = observationForm[name];
        delete observation.properties[name];
      }
    }
  });

  delete observation.properties.forms;

  observation.properties.id = observation._id;
}

Exporter.prototype.mapObservations = function(observations) {
  var self = this;

  if (!Array.isArray(observations)) observations = [observations];

  observations.forEach(function(o) {
    mapObservationProperties(o, self._event);

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
