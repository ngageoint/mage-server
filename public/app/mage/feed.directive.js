var $ = require('jquery')
  , _ = require('underscore')
  , moment = require('moment')
  , MDCTabBar = require('material-components-web').tabBar.MDCTabBar
  , MDCChipSet = require('material-components-web').chips.MDCChipSet
  , MDCSelect = require('material-components-web').select.MDCSelect;

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

NewsFeedController.$inject = ['$rootScope', '$scope', '$element', '$filter', '$timeout', 'EventService', 'UserService', 'FilterService', 'LocalStorageService'];

function NewsFeedController($rootScope, $scope, $element, $filter, $timeout, EventService, UserService, FilterService, LocalStorageService) {
  const tabBar = new MDCTabBar($element.find('.mdc-tab-bar')[0])
  var contentEls = $element.find('.content');

  tabBar.listen('MDCTabBar:activated', function(event) {
    // Hide currently-active content
    document.querySelector('.content--active').classList.remove('content--active');
    // Show content for newly-activated tab
    contentEls[event.detail.index].classList.add('content--active');
    if (!userSelectMdc && event.detail.index === 1) {
      userSelectMdc = new MDCSelect($element.find('.user-select')[0])
      userSelectMdc.listen('MDCSelect:change', () => {
        $scope.$apply(() => {
          $scope.currentUserPage = userSelectMdc.selectedIndex
        })
      })
    }
    userSelectMdc.value = $scope.currentUserPage;
  });

  const chipSet = new MDCChipSet($element.find('.mdc-chip-set')[0])
  let observationSelectMdc;
  let userSelectMdc;

  $scope.currentFeedPanel = 'observationsTab';

  $scope.actionFilter = 'all';

  $scope.currentObservationPage = 0;
  $scope.observationsChanged = 0;
  $scope.observationPages = null;
  var observationsPerPage = 100;

  $scope.currentUserPage = 0;
  $scope.usersChanged = 0;
  $scope.userPages = null;
  $scope.followUserId = null;
  var usersPerPage = 50;

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
    console.log('observation deleted')
  })

  $scope.$on('observation:view', function(e, observation) {
    console.log('view the observation', observation)
    $scope.viewObservation = observation
  });

  $scope.$on('observation:viewDone', function(e, observation) {
    $scope.viewObservation = null;
  })

  $scope.$on('observation:edit', function(e, observation) {
    console.log('edit the observation', observation)
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
    console.log('editform', $scope.editForm)
    console.log('$scope.edit', $scope.edit)
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
    // $timeout(function() {
    //   // scroll to observation in that page
    //   var offset = $($element.find(".feed-items-container")).prop('offsetTop');
    //   var feedElement = $($element.find(".feed-items"));
    //   feedElement.animate({scrollTop: $('#' + observation.id).prop('offsetTop') - offset}, "slow");
    // });
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
      var offset = $($element.find(".observation-card-background-container")).prop('offsetTop');
      var feedElement = $($element.find(".observation-feed-container"));
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

    tabBar.activateTab(1)
    $scope.currentUserPage = page;
    $scope.currentFeedPanel = 'peopleTab';
    $scope.hideFeed = false;

    $timeout(function() {
      // scroll to observation in that page
      var offset = $($element.find(".people-card-background-container")).prop('offsetTop');
      var feedElement = $($element.find(".people-feed-container"));
      feedElement.animate({scrollTop: $('#' + user.id).prop('offsetTop') - offset}, "slow");
    });
  });

  $scope.$on('user:deselect', function(e, user) {
    if ($scope.selectedUser && $scope.selectedUser.id === user.id) {
      $scope.selectedUser = null;
    }
  });

  $scope.$on('user:follow', function(e, user) {
    // $scope.followUserId = $scope.followUserId === user.id ? null : user.id;
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

  $scope.$watch('observationPages', function(newObsPages, oldObsPages) {
    if (!observationSelectMdc) {
      observationSelectMdc = new MDCSelect($element.find('.observation-select')[0])
      observationSelectMdc.listen('MDCSelect:change', () => {
        $scope.$apply(() => {
          $scope.currentObservationPage = observationSelectMdc.selectedIndex
        })
      })
    }
  })

  $scope.$watch('userPages', function() {
    
  })

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
