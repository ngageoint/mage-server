const Observation = require('../models/observation')
  , Location = require('../models/location');

function Exporter(options) {
  this._event = options.event;
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
    },
    sort: { userId: 1 },
    stream: true
  }

  return Observation.getObservations(this._event, options, done);
};

Exporter.prototype.requestLocations = function (options, done) {
  const filter = {
    eventId: this._event._id
  };

  if (options.userId) filter.userId = options.userId;
  if (options.lastLocationId) filter.lastLocationId = options.lastLocationId;
  if (options.startDate) filter.startDate = options.startDate.toDate();
  if (options.endDate) filter.endDate = options.endDate.toDate();

  const sort = { userId: 1, "properties.timestamp": 1, _id: 1 };

  return Location.getLocations({ filter: filter, limit: options.limit, stream: true, sort: sort }, done);
};

module.exports = Exporter;
