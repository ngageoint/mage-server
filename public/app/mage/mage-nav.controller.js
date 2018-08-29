var _ = require('underscore');

module.exports = NavController;

NavController.$inject =  ['$rootScope', '$scope', '$q', '$location', '$uibModal', 'UserService', 'FilterService', 'PollingService', 'Event', 'Settings', 'LocalStorageService'];

function NavController($rootScope, $scope, $q, $location, $uibModal, UserService, FilterService, PollingService, Event, Settings, LocalStorageService) {
  var events = [];
  $scope.location = $location;

  $scope.preferences = {
    timeZone: LocalStorageService.getTimeZoneView(),
    timeFormat: LocalStorageService.getTimeFormat(),
    coordinateSystem: LocalStorageService.getCoordinateSystemView()
  };

  $scope.pollingInterval = PollingService.getPollingInterval();

  Settings.get({type: 'banner'}, function(banner) {
    $scope.banner = banner.settings;
  });

  $rootScope.$on('event:user', function(e, login) {
    $scope.token = login.token;
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
  });

  $rootScope.$on('logout', function() {
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  $scope.$on('$routeChangeSuccess', function() {
    if ($location.path() === '/map') {
      events = Event.query(function() {
        var recentEventId = UserService.getRecentEventId();
        var recentEvent = _.find(events, function(event) { return event.id === recentEventId; });
        if (recentEvent) {
          FilterService.setFilter({event: recentEvent});
          PollingService.setPollingInterval($scope.pollingInterval);
        } else if (events.length > 0) {
          // TODO 'welcome to MAGE dialog'
          FilterService.setFilter({event: events[0]});
          PollingService.setPollingInterval($scope.pollingInterval);
        } else {
          // TODO welcome to mage, sorry you have no events
        }
      });
    } else {
      FilterService.removeFilters();
      PollingService.setPollingInterval(0);
    }
  });

  $scope.logout = function() {
    UserService.logout();
  };

  $scope.onPollingIntervalChanged = function(pollingInterval) {
    $scope.pollingInterval = pollingInterval;
    PollingService.setPollingInterval(pollingInterval);
  };

  $scope.onFilterClick = function() {
    $uibModal.open({
      template: require('../filter/filter.html'),
      controller: 'FilterController',
      backdrop: 'static',
      resolve: {
        events: function () {
          return events;
        }
      }
    });
  };

  $scope.onCoordinateSystemChange = function(coordinateSystem) {
    LocalStorageService.setCoordinateSystemView(coordinateSystem);
  };

  $scope.onTimeZoneChange = function(timeZone) {
    LocalStorageService.setTimeZoneView(timeZone);
  };

  $scope.onTimeFormatChange = function(timeFormat) {
    LocalStorageService.setTimeFormat(timeFormat);
  };

  $scope.onExportClick = function() {
    $uibModal.open({
      template: require('../export/export.html'),
      controller: 'ExportController',
      backdrop: 'static',
      resolve: {
        events: function () {
          return events;
        }
      }
    });
  };
}
