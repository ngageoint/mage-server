angular
  .module('mage')
  .controller('AdminEventController', AdminEventController);

AdminEventController.$inject = ['$scope', '$location', '$filter', '$routeParams', '$q', '$modal', 'LocalStorageService', 'EventService', 'Event', 'Team', 'Layer'];

function AdminEventController($scope, $location, $filter, $routeParams, $q, $modal, LocalStorageService, EventService, Event, Team, Layer) {
  $scope.token = LocalStorageService.getToken();

  $scope.editTeams = false;
  $scope.eventTeams = [];
  $scope.teamsPage = 0;
  $scope.teamsPerPage = 10;

  $scope.editLayers = false;
  $scope.eventLayers = [];
  $scope.layersPage = 0;
  $scope.layersPerPage = 10;

  $scope.teams = [];
  $scope.layers = [];

  var teamsById = {};
  var layersById = {};

  $q.all({teams: Team.query().$promise, layers: Layer.query().$promise, event: Event.get({id: $routeParams.eventId, populate: false}).$promise}).then(function(result) {
    $scope.teams = result.teams;
    teamsById = _.indexBy(result.teams, 'id');

    $scope.layers = result.layers;
    layersById = _.indexBy(result.layers, 'id');

    $scope.event = result.event;
    $scope.team = {};
    $scope.eventTeams = _.map($scope.event.teamIds, function(teamId) { return teamsById[teamId] });
    $scope.nonTeams = _.filter($scope.teams, function(team) {
      return $scope.event.teamIds.indexOf(team.id) === -1;
    });

    $scope.layer = {};
    $scope.eventLayers = _.map($scope.event.layerIds, function(layerId) { return layersById[layerId] });
    $scope.nonLayers = _.filter($scope.layers, function(layer) {
     return $scope.event.layerIds.indexOf(layer.id) === -1;
    });

  });

  function saveEvent(event) {
    event.$save({populate: false}, function() {

    });
  }

  $scope.filterTeams = function(team) {
    var filteredTeams = $filter('filter')([team], $scope.teamSearch);
    return filteredTeams && filteredTeams.length;
  }

  $scope.filterLayers = function(layer) {
    var filteredLayers = $filter('filter')([layer], $scope.layerSearch);
    return filteredLayers && filteredLayers.length;
  }

  $scope.addTeam = function(team) {
    $scope.team = {};
    $scope.event.teamIds.push(team.id);
    $scope.eventTeams.push(team);
    $scope.nonTeams = _.reject($scope.nonTeams, function(t) { return t.id == team.id; });

    saveEvent($scope.event);
  }

  $scope.removeTeam = function(team) {
    $scope.event.teamIds = _.reject($scope.event.teamIds, function(teamId) {return teamId == team.id;});
    $scope.eventTeams = _.reject($scope.eventTeams, function(t) { return t.id == team.id;});
    $scope.nonTeams.push(team);

    saveEvent($scope.event);
  }

  $scope.addLayer = function(layer) {
    $scope.layer = {};
    $scope.event.layerIds.push(layer.id);
    $scope.eventLayers.push(layer);
    $scope.nonLayers = _.reject($scope.nonLayers, function(l) { return l.id == layer.id; });

    saveEvent($scope.event);
  }

  $scope.removeLayer = function(layer) {
    $scope.event.layerIds = _.reject($scope.event.layerIds, function(layerId) {return layerId == layer.id;});
    $scope.eventLayers = _.reject($scope.eventLayers, function(l) { return l.id == layer.id;});
    $scope.nonLayers.push(layer);

    saveEvent($scope.event);
  }

  $scope.editEvent = function(event) {
    $location.path('/admin/events/' + event.id + '/edit');
  }

  $scope.editForm = function(event) {
    $location.path('/admin/events/' + event.id + '/edit/form');
  }

  $scope.deleteEvent = function() {
    var modalInstance = $modal.open({
      templateUrl: '/app/admin/events/event-delete.html',
      resolve: {
        event: function () {
          return $scope.event;
        }
      },
      controller: ['$scope', '$modalInstance', 'event', function ($scope, $modalInstance, event) {
        $scope.event = event;

        $scope.deleteEvent = function(event, force) {
          event.$delete(function(success) {
            $modalInstance.close(event);
          });
        }
        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function (event) {
      $location.path('/admin/events');
    }, function () {
    });
  }
}
