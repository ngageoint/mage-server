var $ = require('jquery')
  , _ = require('underscore')
  , moment = require('moment');

module.exports = NewsFeed;

function NewsFeed() {
  var directive = {
    restrict: "A",
    template:  require('./feed.directive.html'),
    scope: {
      event: '=',
      observations: '=feedObservations',
      feedObservationsChanged: '=',
      users: '=feedUsers',
      feedUsersChanged: '='
    },
    controller: NewsFeedController
  };

  return directive;
}

NewsFeedController.$inject = ['$scope', '$element', 'EventService', 'FilterService', 'LocalStorageService'];

function NewsFeedController($scope, $element, EventService, FilterService, LocalStorageService) {
  var contentEls = $element.find('.content');

  $scope.tabs = [{
    tabName: 'Observations',
    tabId: 'observations',
    icon: 'place'
  }, {
    tabName: 'People',
    tabId: 'people',
    icon: 'supervisor_account'
  }]

  $scope.onTabSwitched = function(index) {
    $scope.currentFeedPanel = $scope.tabs[index].tabId;
    let active = $element.find('.content--active')[0];
    active.classList.remove('content--active');
    contentEls[index].classList.add('content--active');
  }

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

  $scope.createNewObservation = function() {
    const mapPos = LocalStorageService.getMapPosition();
    $scope.$emit('observation:latlng', mapPos.center);
  }

  $scope.cancelNewObservation = function() {
    $scope.newObservationForms = null;
    $scope.$emit('observation:cancel');
  };

  $scope.$on('observation:delete', function() {
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewObservation = null;
  })

  $scope.$on('user:view', function(e, user) {
    $scope.viewUser = user
  });

  $scope.$on('user:viewDone', function(e, user) {
    $scope.viewUser = null;
  })

  $scope.$on('observation:view', function(e, observation) {
    $scope.viewObservation = observation
  });

  $scope.$on('observation:viewDone', function(e, observation) {
    $scope.viewObservation = null;
  })

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

  $scope.$on('observation:feed', function(e, observation) {
    newObservation = observation;
    var newObservationForms = EventService.getForms(observation, {archived: false});

    if (newObservationForms.length === 0) {
      $scope.createObservation();
    } else if (newObservationForms.length === 1) {
      $scope.createObservation(newObservationForms[0]);
    } else {
      $scope.newObservationForms = newObservationForms;
    }
  });

  $scope.$on('observation:editDone', function(event, observation) {
    $scope.newObservation = null;
    $scope.editObservation = null;
  });

  $scope.$on('observation:cancel', function() {
    $scope.newObservation = null;
  });

  $scope.$watch('event', function() {
    $scope.newObservation = null;
    $scope.editObservation = null;
    $scope.viewObservation = null;
    $scope.viewUser = null;
  })

  $scope.$watch('currentFeedPanel', function(currentFeedPanel) {
    if (currentFeedPanel === 'observations') {
      $scope.feedObservationsChanged = {count: 0};
      $scope.observationsChanged = 0;
      $scope.$broadcast('map:visible');
    } else if (currentFeedPanel === 'people') {
      $scope.feedUsersChanged = {};
      $scope.usersChanged = 0;
    }
  });

  $scope.$watch('actionFilter', function(actionFilter) {
    FilterService.setFilter({actionFilter: actionFilter});
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
  });
}
