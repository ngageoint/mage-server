var util = require('util');

function transformObservations(observations, options) {
  return observations.map(function(observation) {
    return observation.toJSON({transform: true, eventId: options.eventId, path: options.path});
  });
}

exports.transform = function(observations, options) {
  options = options || {};

  return util.isArray(observations) ?
    transformObservations(observations, options) :
    observations.toJSON({transform: true, eventId: options.eventId, path: options.path});
};
