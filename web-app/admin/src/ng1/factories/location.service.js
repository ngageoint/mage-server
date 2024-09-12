function LocationService($q, $httpParamSerializer, Location) {

  // Specify times in milliseconds
  const colorBuckets = [{
    min: Number.NEGATIVE_INFINITY,
    max: 600000,
    color: '#0000FF' // blue
  },{
    min: 600001,
    max: 1800000,
    color: '#FFFF00' // yellow
  },{
    min: 1800001,
    max: Number.MAX_VALUE,
    color: '#FF5721' // orange
  }];

  function getUserLocationsForEvent(event, options) {
    const deferred = $q.defer();

    const parameters = { eventId: event.id, groupBy: 'users', populate: 'true' };
    if (options.interval) {
      parameters.startDate = options.interval.start;
      parameters.endDate = options.interval.end;
    }

    Location.query(parameters, function (userLocations) {
      deferred.resolve(userLocations);
    });

    return deferred.promise;
  }

  const service = {
    getUserLocationsForEvent: getUserLocationsForEvent,
    colorBuckets: colorBuckets
  };

  return service;
}

module.exports = LocationService;

LocationService.$inject = ['$q', '$httpParamSerializer', 'Location'];
