var _ = require('underscore');

module.exports = MageController;

MageController.$inject = [
  '$scope',
  '$animate',
  '$document',
  '$uibModal',
  'UserService',
  'FilterService',
  'EventService',
  'MapService',
  'Location'
];

function MageController($scope, $animate, $document, $uibModal, UserService, FilterService, EventService, MapService, Location) {
  $scope.hideFeed = false;

  var firstObservationChange = true;

  var firstUserChange = true;
  $scope.feedChangedUsers = {};

  $scope.filteredEvent = FilterService.getEvent();
  $scope.filteredInterval = FilterService.getIntervalChoice().label;

  $animate.on('addClass', $document.find('.feed'), resolveMapAfterFeaturesPaneTransition);
  $animate.on('removeClass', $document.find('.feed'), resolveMapAfterFeaturesPaneTransition);

  function resolveMapAfterFeaturesPaneTransition($mapPane, animationPhase) {
    if (animationPhase === 'close') {
      MapService.hideFeed($scope.hideFeed);
    }
  }

  MapService.initialize();

  var filterChangedListener = {
    onFilterChanged: onFilterChanged
  };
  FilterService.addListener(filterChangedListener);

  var locationListener = {
    onLocation: onLocation,
    onBroadcastLocation: onBroadcastLocation
  };
  MapService.addListener(locationListener);

  function onFilterChanged(filter) {
    $scope.feedChangedUsers = {};

    firstUserChange = true;
    firstObservationChange = true;

    if (filter.event) {
      $scope.filteredEvent = FilterService.getEvent();

      // Stop broadcasting location if the event switches
      MapService.onLocationStop();
    }

    if (filter.teams) $scope.filteredTeams = _.map(FilterService.getTeams(), function(t) { return t.name; }).join(', ');
    if (filter.timeInterval) {
      var intervalChoice = FilterService.getIntervalChoice();
      if (intervalChoice.filter !== 'all') {
        if (intervalChoice.filter === 'custom') {
          // TODO format custom time interval
          $scope.filteredInterval = 'Custom time interval';
        } else {
          $scope.filteredInterval = intervalChoice.label;
        }
      } else {
        $scope.filteredInterval = null;
      }
    }
  }

  function onLocation(l) {
    var event = FilterService.getEvent();
    Location.create({
      eventId: event.id,
      geometry: {
        type: 'Point',
        coordinates: [l.longitude, l.latitude]
      },
      properties: {
        timestamp: new Date().valueOf(),
        accuracy: l.accuracy,
        altitude: l.altitude,
        altitudeAccuracy: l.altitudeAccuracy,
        heading: l.heading,
        speed: l.speed
      }
    });
  }

  function onBroadcastLocation(callback) {
    if (!EventService.isUserInEvent(UserService.myself, FilterService.getEvent())) {
      $uibModal.open({
        template: require('../error/not.in.event.html'),
        controller: 'NotInEventController',
        resolve: {
          title: function() {
            return 'Cannot Broadcast Location';
          }
        }
      });

      callback(false);
    } else {
      callback(true);
    }
  }

  $scope.$on('$destroy', function() {
    FilterService.removeListener(filterChangedListener);
    MapService.destroy();
  });

  $scope.$on('feed:show', function() {
    $scope.hideFeed = false;
  })

  $scope.$on('feed:toggle', function() {
    $scope.hideFeed = !$scope.hideFeed;
  });

}
