var _ = require('underscore')
  , moment = require('moment');

module.exports = NewsFeed;

function NewsFeed() {
  var directive = {
    restrict: "A",
    template:  require('./feed.directive.html'),
    scope: {
      event: '=',
      feedUsersChanged: '=',
      onToggleFeed: '&'
    },
    controller: NewsFeedController
  };

  return directive;
}

NewsFeedController.$inject = ['$scope', '$element', 'MapService', 'EventService', 'ObservationService', 'FilterService', 'LocalStorageService', 'UserService', 'Observation', '$uibModal'];

function NewsFeedController($scope, $element, MapService, EventService, ObservationService, FilterService, LocalStorageService, UserService, Observation, $uibModal) {
  var contentEls = $element.find('.content');

  $scope.tabs = [{
    tabName: 'Observations',
    tabId: 'observations',
    icon: 'place'
  }, {
    tabName: 'People',
    tabId: 'people',
    icon: 'supervisor_account'
  }];

  $scope.onTabSwitched = function(index) {
    $scope.currentFeedPanel = $scope.tabs[index].tabId;
    let active = $element.find('.content--active')[0];
    active.classList.remove('content--active');
    contentEls[index].classList.add('content--active');
  };

  $scope.currentFeedPanel = 'observations';

  var newObservation;

  $scope.createObservation = function(form) {
    delete $scope.newObservationForms;
    $scope.newObservation = newObservation;

    $scope.newObservationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        name: 'geometry',
        value: newObservation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        name:'timestamp',
        value: moment(newObservation.properties.timestamp).toDate()
      },
      forms: []
    };

    if (form) {
      var observationForm = EventService.createForm(newObservation, form);
      observationForm.name = form.name;
      $scope.newObservationForm.forms.push(observationForm);
    }

  };

  $scope.$on('user:view', function(e, user) {
    $scope.viewUser = user;
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewObservation = null;

    $scope.onToggleFeed({
      $event: {
        hidden: false
      }
    });
  });

  $scope.$on('user:viewDone', function() {
    $scope.viewUser = null;
  });

  $scope.$on('observation:view', function(e, observation) {
    $scope.viewObservation = observation;
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewUser = null;

    $scope.onToggleFeed({
      $event: {
        hidden: false
      }
    });
  });

  $scope.$on('observation:viewDone', function() {
    MapService.deselectFeatureInLayer($scope.viewObservation, 'Observations');
    $scope.viewObservation = null;
  });

  $scope.$on('observation:edit', function(e, observation) {
    $scope.edit = true;

    var formMap = _.indexBy(EventService.getForms(observation), 'id');
    var form = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        name: 'geometry',
        value: observation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        name: 'timestamp',
        value: moment(observation.properties.timestamp).toDate()
      },
      forms: []
    };

    _.each(observation.properties.forms, function(propertyForm) {
      var observationForm = EventService.createForm(observation, formMap[propertyForm.formId]);
      observationForm.name = formMap[propertyForm.formId].name;
      form.forms.push(observationForm);
    });

    $scope.editForm = form;
    $scope.editObservation = observation;
  });

  $scope.createNewObservation = function() {
    var event = FilterService.getEvent();
    if (!EventService.isUserInEvent(UserService.myself, event)) {
      $uibModal.open({
        template: require('../error/not.in.event.html'),
        controller: 'NotInEventController',
        resolve: {
          title: function() {
            return 'Cannot Create Observation';
          }
        }
      });

      return;
    }

    const mapPos = LocalStorageService.getMapPosition();
    newObservation = new Observation({
      id: 'new',
      eventId: event.id,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [mapPos.center.lng, mapPos.center.lat]
      },
      properties: {
        timestamp: new Date(),
        forms: []
      }
    });

    var newObservationForms = EventService.getForms(newObservation, {archived: false});
    newObservation.style = {
      iconUrl: getIconUrl(event, newObservationForms)
    };

    if (newObservationForms.length === 0) {
      $scope.createObservation();
    } else if (newObservationForms.length === 1) {
      $scope.createObservation(newObservationForms[0]);
    } else {
      $scope.newObservationForms = newObservationForms;
    }
  };

  function getIconUrl(event, forms) {
    const primaryForm = forms.length ? forms[0] : {};
    const fields = forms.length ? forms[0].fields : [];
    var primary = _.find(fields, function(field) {
      return field.name === primaryForm.primaryField;
    }) || {};

    var secondary = _.find(fields, function(field) {
      return field.name === primaryForm.variantField;
    }) || {};

    return ObservationService.getObservationIconUrlForEvent(event.id, primaryForm.id, primary.value, secondary.value);
  }

  $scope.onFormClose = function() {
    $scope.newObservation = null;
    $scope.editObservation = null;
  }

  $scope.onObservationDelete = function($event) {
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewObservation = null;
    MapService.removeFeatureFromLayer($event.observation, 'Observations');
  }

  $scope.$watch('event', function() {
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewObservation = null;
    $scope.viewUser = null;
  });

  $scope.$watch('currentFeedPanel', function(currentFeedPanel) {
    if (currentFeedPanel === 'observations') {
      $scope.observationsChanged = 0;
      $scope.$broadcast('map:visible');
    } else if (currentFeedPanel === 'people') {
      $scope.feedUsersChanged = {};
      $scope.usersChanged = 0;
    }
  });

  $scope.$watch('feedObservationsChanged', function(feedObservationsChanged) {
    if (!feedObservationsChanged) return;

    if ($scope.currentFeedPanel === 'people') {
      $scope.observationsChanged = feedObservationsChanged.count;
    }
  }, true);

  $scope.$watch('feedUsersChanged', function(feedUsersChanged) {
    if (!feedUsersChanged) return;

    if ($scope.currentFeedPanel === 'observations') {
      $scope.usersChanged = _.keys(feedUsersChanged).length;
    }
  }, true);

  $scope.$on('user:select', function(e, user) {
    $scope.viewUser = user;
    $scope.viewObservation = null;
    $scope.editObservation = null;
    $scope.newObservation = null;

    $scope.onToggleFeed({
      $event: {
        hidden: false
      }
    });
  });
}
