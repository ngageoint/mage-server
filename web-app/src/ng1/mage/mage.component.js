import _ from 'underscore';
import moment from 'moment';

class MageController {
  constructor($animate, $document, $timeout, $uibModal, UserService, FilterService, EventService, MapService, ObservationService, Location, Observation) {
    this.$animate = $animate;
    this.$document = $document;
    this.$timeout = $timeout;
    this.$uibModal = $uibModal;
    this.UserService = UserService;
    this.FilterService = FilterService;
    this.EventService = EventService;
    this.MapService = MapService;
    this.ObservationService = ObservationService;
    this.Location = Location;
    this.Observation = Observation;

    this.hideFeed = false;
    this.feedChangedUsers = {};
  
    this.filteredEvent = FilterService.getEvent();
    this.filteredInterval = FilterService.getIntervalChoice().label;
  }

  $onInit() {
    this.$animate.on('addClass', this.$document.find('.feed'), ($mapPane, animationPhase) => {
      this.resolveMapAfterFeaturesPaneTransition(animationPhase);
    });
    this.$animate.on('removeClass', this.$document.find('.feed'), ($mapPane, animationPhase) => {
      this.resolveMapAfterFeaturesPaneTransition(animationPhase);
    });

    this.MapService.initialize();

    this.filterChangedListener = {
      onFilterChanged: filter => {
        this.onFilterChanged(filter);
      }
    };
    this.FilterService.addListener(this.filterChangedListener);
  
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

  $onChanges(changes) {
    if (changes.toggleFeed && !changes.toggleFeed.isFirstChange()) {
      this.hideFeed = !this.hideFeed;
    }
  }

  $onDestroy() {
    this.FilterService.removeListener(this.filterChangedListener);
    this.MapService.destroy();
  }

  resolveMapAfterFeaturesPaneTransition(animationPhase) {
    if (animationPhase === 'close') {
      this.MapService.hideFeed(this.hideFeed);
    }
  }

  onMap($event) {
    this.map = $event.map;
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

  onToggleFeed($event) {
    this.hideFeed = $event.hidden;
  }

  showFeed() {
    this.hideFeed = false;
  }

  onAddObservation($event) {
    if (this.hideFeed) {
      this.showFeed();
    }

    this.newObservation = $event;
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

MageController.$inject = ['$animate', '$document', '$timeout', '$uibModal', 'UserService', 'FilterService', 'EventService', 'MapService', 'ObservationService', 'Location', 'Observation'];

export default {
  template: require('./mage.html'),
  bindings: {
    user: '<',
    toggleFeed: '<'
  },
  controller: MageController
};