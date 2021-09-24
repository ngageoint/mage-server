function transformObservations(observations, options) {
  return observations.map(function(observation) {
    return observation.toJSON({transform: true, event: options.event, path: options.path});
  });
}

exports.transform = function(observations, options) {
  options = options || {};
  return Array.isArray(observations) ?
    transformObservations(observations, options) :
    observations.toJSON({transform: true, event: options.event, path: options.path});
};
