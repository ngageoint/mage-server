import _ from 'underscore';

class MageController {
  constructor($animate, $document, $uibModal, UserService, FilterService, EventService, MapService, Location) {
    this.$animate = $animate;
    this.$document = $document;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
    this.FilterService = FilterService;
    this.EventService = EventService;
    this.MapService = MapService;
    this.Location = Location;

    this.hideFeed = false;
    this.feedChangedUsers = {};
  
    this.filteredEvent = FilterService.getEvent();
    this.filteredInterval = FilterService.getIntervalChoice().label;
  }

  $onInit() {
    this.$animate.on('addClass', this.$document.find('.feed'), this.resolveMapAfterFeaturesPaneTransition);
    this.$animate.on('removeClass', this.$document.find('.feed'), this.resolveMapAfterFeaturesPaneTransition);

    this.MapService.initialize();

    var filterChangedListener = {
      onFilterChanged: filter => {
        this.onFilterChanged(filter);
      }
    };
    this.FilterService.addListener(filterChangedListener);
  
    var locationListener = {
      onLocation: location => {
        this.onLocation(location);
      },
      onBroadcastLocation: callback => {
        this.onBroadcastLocation(callback);
      }
    };
    this.MapService.addListener(locationListener);
  }

  resolveMapAfterFeaturesPaneTransition($mapPane, animationPhase) {
    if (animationPhase === 'close') {
      this.MapService.hideFeed(this.hideFeed);
    }
  }

  onFilterChanged(filter) {
    this.feedChangedUsers = {};

    if (filter.event) {
      this.filteredEvent = this.FilterService.getEvent();

      // Stop broadcasting location if the event switches
      this.MapService.onLocationStop();
    }

    if (filter.teams) this.filteredTeams = _.map(this.FilterService.getTeams(), t => { return t.name; }).join(', ');
    if (filter.timeInterval) {
      var intervalChoice = this.FilterService.getIntervalChoice();
      if (intervalChoice.filter !== 'all') {
        if (intervalChoice.filter === 'custom') {
          // TODO format custom time interval
          this.filteredInterval = 'Custom time interval';
        } else {
          this.filteredInterval = intervalChoice.label;
        }
      } else {
        this.filteredInterval = null;
      }
    }
  }

  onLocation(location) {
    var event = this.FilterService.getEvent();
    this.Location.create({
      eventId: event.id,
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      },
      properties: {
        timestamp: new Date().valueOf(),
        accuracy: location.accuracy,
        altitude: location.altitude,
        altitudeAccuracy: location.altitudeAccuracy,
        heading: location.heading,
        speed: location.speed
      }
    });
  }

  onBroadcastLocation(callback) {
    if (!this.EventService.isUserInEvent(this.UserService.myself, this.FilterService.getEvent())) {
      // TODO make a component
      this.$uibModal.open({
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
}

// TODO 
// $scope.$on('$destroy', function() {
//   FilterService.removeListener(filterChangedListener);
//   MapService.destroy();
// });

// $scope.$on('feed:show', function() {
//   $scope.hideFeed = false;
// });

// $scope.$on('feed:toggle', function() {
//   $scope.hideFeed = !$scope.hideFeed;
// });

MageController.$inject = ['$animate', '$document', '$uibModal', 'UserService', 'FilterService', 'EventService', 'MapService', 'Location'];

export default {
  template: require('./mage.html'),
  bindings: {
    user: '<'
  },
  controller: MageController
};