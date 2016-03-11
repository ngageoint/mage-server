angular
  .module('mage')
  .factory('LocationService', LocationService);

LocationService.$inject = ['$q', 'Location', 'UserService', 'LocalStorageService'];

function LocationService($q, Location, UserService, LocalStorageService) {

  // Specify times in milliseconds
  var colorBuckets = [{
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

  var service = {
    getUserLocationsForEvent: getUserLocationsForEvent,
    colorBuckets: colorBuckets
  };

  return service;

  function getUserLocationsForEvent(event, options) {
    var deferred = $q.defer();

    var parameters = {eventId: event.id, groupBy: 'users'};
    if (options.interval) {
      parameters.startDate = options.interval.start;
      parameters.endDate = options.interval.end;
    }

    UserService.getAllUsers().then(function(response) {
      var users = response.data || response;
      var usersById = _.indexBy(users, 'id');

      Location.query(parameters, function(userLocations) {
        _.each(userLocations, function(userLocation) {
          var user = usersById[userLocation.id];
          if (user && user.iconUrl) {
            userLocation.locations[0].style = {
              iconUrl: '/api/users/' + user.id + '/icon?' + $.param({access_token: LocalStorageService.getToken(), _dc: user.updatedAt})
            };
          }

          _.extend(userLocation, user);
        });

        deferred.resolve(userLocations);
      });
    });

    return deferred.promise;
  }
}
