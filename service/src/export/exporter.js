const api = require('../api')
  , Location = require('../models/location');

function Exporter(options) {
  this._event = options.event;
  this._users = options.users;
  this._devices = options.devices;
  this._filter = options.filter;
}

Exporter.prototype.requestObservations = function (filter, done) {
  const options = {
    filter: {
      states: ['active'],
      observationStartDate: filter.startDate,
      observationEndDate: filter.endDate,
      favorites: filter.favorites,
      important: filter.important,
      attachments: filter.attachments
    }
  }

  new api.Observation(this._event).getAll(options, done);
};

Exporter.prototype.requestLocations = function (options, done) {
  const filter = {
    eventId: this._event._id
  };

  if (options.userId) filter.userId = options.userId;
  if (options.lastLocationId) filter.lastLocationId = options.lastLocationId;
  if (options.startDate) filter.startDate = options.startDate.toDate();
  if (options.endDate) filter.endDate = options.endDate.toDate();

  return Location.getLocations({ filter: filter, limit: options.limit, stream: options.stream }, done);
};

module.exports = Exporter;
