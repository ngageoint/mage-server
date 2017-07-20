angular
  .module('mage')
  .directive('newsFeed', newsFeed);

function newsFeed() {
  var directive = {
    restrict: "A",
    templateUrl:  "app/mage/feed.directive.html",
    scope: {
      observations: '=feedObservations',
      feedObservationsChanged: '=',
      users: '=feedUsers',
      feedUsersChanged: '='
    },
    controller: NewsFeedController
  };

  return directive;
}

NewsFeedController.$inject = ['$rootScope', '$scope', '$element', '$filter', '$timeout', 'EventService', 'UserService', 'FilterService'];

function NewsFeedController($rootScope, $scope, $element, $filter, $timeout, EventService, UserService, FilterService) {

  $scope.currentFeedPanel = 'observationsTab';

  $scope.actionFilter = 'all';

  $scope.currentObservationPage = 0;
  $scope.observationsChanged = 0;
  $scope.observationPages = null;
  var observationsPerPage = 25;

  $scope.currentUserPage = 0;
  $scope.usersChanged = 0;
  $scope.userPages = null;
  $scope.followUserId = null;
  var usersPerPage = 25;

  calculateObservationPages($scope.observations);
  calculateUserPages($scope.users);

  var newObservation;

  $scope.createObservation = function(form) {
    delete $scope.newObservationForms;
    $scope.newObservation = newObservation;

    $scope.newObservationForm = {
      geometryField: {
        title: 'Location',
        type: 'geometry',
        value: newObservation.geometry
      },
      timestampField: {
        title: 'Date',
        type: 'date',
        value: moment(newObservation.properties.timestamp).toDate()
      },
      forms: []
    };

    if (form) {
      var observationForm = EventService.createForm(newObservation, form);
      observationForm.name = form.name;
      $scope.newObservationForm.forms.push(observationForm);
    }

    $scope.$emit('observation:create');
  };

  $scope.$on('observation:feed', function(e, observation) {
    newObservation = observation;
    var newObservationForms = EventService.getForms(observation);

    if (newObservationForms.length === 0) {
      $scope.createObservation();
    } else if (newObservationForms.length === 1) {
      $scope.createObservation(newObservationForms[0]);
    } else {
      $scope.newObservationForms = newObservationForms;
    }
  });

  $scope.$on('observation:moved', function(e, observation, latlng) {
    if (!$scope.newObservation || !latlng) return;

    $scope.newObservation.geometry.coordinates = [latlng.lng, latlng.lat];

    var geometryField = EventService.getFormField($scope.newObservationForm, 'geometry');
    geometryField.value = {x: latlng.lng, y: latlng.lat};
  });

  $scope.$on('observation:editDone', function(event, observation) {
    $scope.newObservation = null;
    $timeout(function() {
      // scroll to observation in that page
      var offset = $($element.find(".feed-items-container")).prop('offsetTop');
      var feedElement = $($element.find(".feed-items"));
      feedElement.animate({scrollTop: $('#' + observation.id).prop('offsetTop') - offset}, "slow");
    });
  });

  $scope.$on('observation:cancel', function() {
    $scope.newObservation = null;
  });

  $scope.$watch('currentFeedPanel', function(currentFeedPanel) {
    if (currentFeedPanel === 'observationsTab') {
      $scope.feedObservationsChanged = {count: 0};
      $scope.observationsChanged = 0;
      $scope.$broadcast('map:visible');
    } else if (currentFeedPanel === 'peopleTab') {
      $scope.feedUsersChanged = {};
      $scope.usersChanged = 0;
    }
  });

  $scope.$watch('actionFilter', function(actionFilter) {
    FilterService.setFilter({actionFilter: actionFilter});
  });

  $scope.$watch('feedObservationsChanged', function(feedObservationsChanged) {
    if (!feedObservationsChanged) return;

    if ($scope.currentFeedPanel === 'peopleTab') {
      $scope.observationsChanged = feedObservationsChanged.count;
    }
  }, true);

  $scope.$watch('feedUsersChanged', function(feedUsersChanged) {
    if (!feedUsersChanged) return;

    if ($scope.currentFeedPanel === 'observationsTab') {
      $scope.usersChanged = _.keys(feedUsersChanged).length;
    }
  }, true);

  $scope.$on('observation:select', function(e, observation, options) {
    $scope.selectedObservation = observation;
    if (!options || !options.scrollTo) return;

    // locate the page this observation is on
    var page;
    for (page = 0; page < $scope.observationPages.length; page++) {
      var last = _.last($scope.observationPages[page]);
      if (last.properties.timestamp <= observation.properties.timestamp) {
        break;
      }
    }

    $scope.currentObservationPage = page;
    $scope.currentFeedPanel = 'observationsTab';
    $scope.hideFeed = false;

    $timeout(function() {
      // scroll to observation in that page
      var offset = $($element.find(".feed-items-container")).prop('offsetTop');
      var feedElement = $($element.find(".feed-items"));
      feedElement.animate({scrollTop: $('#' + observation.id).prop('offsetTop') - offset}, "slow");
    });
  });

  $scope.$on('observation:deselect', function(e, observation) {
    if ($scope.selectedObservation && $scope.selectedObservation.id === observation.id) {
      $scope.selectedObservation = null;
    }
  });

  $scope.$on('user:select', function(e, user) {
    $scope.selectedUser = user;

    // locate the page this user is on
    var page;
    for (page = 0; page < $scope.userPages.length; page++) {
      var last = _.last($scope.userPages[page]);
      if (last.location.properties.timestamp <= user.location.properties.timestamp) {
        break;
      }
    }

    $scope.currentUserPage = page;
    $scope.currentFeedPanel = 'peopleTab';
    $scope.hideFeed = false;

    $timeout(function() {
      // scroll to observation in that page
      var offset = $($element.find(".feed-items-container")).prop('offsetTop');
      var feedElement = $($element.find(".feed-items"));
      feedElement.animate({scrollTop: $('#' + user.id).prop('offsetTop') - offset}, "slow");
    });
  });

  $scope.$on('user:deselect', function(e, user) {
    if ($scope.selectedUser && $scope.selectedUser.id === user.id) {
      $scope.selectedUser = null;
    }
  });

  $scope.$on('user:follow', function(e, user) {
    $scope.followUserId = $scope.followUserId === user.id ? null : user.id;
  });

  $scope.$watch('observations', function(observations) {
    calculateObservationPages(observations);
  });

  $scope.$watch('users', function(users) {
    calculateUserPages(users);
  });

  function calculateObservationPages(observations) {
    if (!observations) return;

    // sort the observations
    observations = $filter('orderBy')(observations, function(observation) {
      return moment(observation.properties.timestamp).valueOf() * -1;
    });

    // slice into pages
    var pages = [];
    for (var i = 0, j = observations.length; i < j; i += observationsPerPage) {
      pages.push(observations.slice(i, i + observationsPerPage));
    }

    $scope.observationPages = pages;
    $scope.currentObservationPage = $scope.currentObservationPage || 0;
  }

  function calculateUserPages(users) {
    if (!users) return;

    // sort the locations
    users = $filter('orderBy')(users, function(user) {
      return moment(user.location.properties.timestamp).valueOf() * -1;
    });

    // slice into pages
    var pages = [];
    for (var i = 0, j = users.length; i < j; i += usersPerPage) {
      pages.push(users.slice(i, i + usersPerPage));
    }

    $scope.userPages = pages;
    $scope.currentUserPage = $scope.currentUserPage || 0;

  }
}
