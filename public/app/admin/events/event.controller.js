angular
  .module('mage')
  .controller('AdminEventController', AdminEventController);

AdminEventController.$inject = ['$scope', '$location', '$filter', '$routeParams', '$q', '$modal', 'LocalStorageService', 'UserService', 'EventService', 'Event', 'Team', 'Layer'];

function AdminEventController($scope, $location, $filter, $routeParams, $q, $modal, LocalStorageService, UserService, EventService, Event, Team, Layer) {
  $scope.token = LocalStorageService.getToken();

  $scope.editTeams = false;
  $scope.eventMembers = [];
  $scope.teamsPage = 0;
  $scope.teamsPerPage = 10;

  $scope.editLayers = false;
  $scope.eventLayers = [];
  $scope.layersPage = 0;
  $scope.layersPerPage = 10;

  $scope.teams = [];
  $scope.layers = [];

  $scope.member = {};

  var teamsById = {};
  var layersById = {};
  var eventTeam;

  function normalize(item) {
    return {
      id: item.id,
      name: item.name || item.displayName,
      type: item.name ? 'team' : 'user'
    };
  }

  $q.all({users: UserService.getAllUsers(), teams: Team.query().$promise, layers: Layer.query().$promise, event: Event.get({id: $routeParams.eventId, populate: false}).$promise}).then(function(result) {
    $scope.teams = result.teams;
    teamsById = _.indexBy(result.teams, 'id');

    $scope.layers = result.layers;
    layersById = _.indexBy(result.layers, 'id');

    $scope.event = result.event;

    var eventTeamId = _.find($scope.event.teamIds, function(teamId) {
      return teamsById[teamId].teamEventId === $scope.event.id;
    });
    eventTeam = teamsById[eventTeamId];

    var teamIdsInEvent = _.filter($scope.event.teamIds, function(teamId) {
      return teamsById[teamId].teamEventId !== $scope.event.id;
    });
    var teamsInEvent = _.map(teamIdsInEvent, function(teamId) { return teamsById[teamId]; });

    var usersInEvent = _.filter(result.users.data, function(user) {
      return _.findWhere(eventTeam.users, {id: user.id});
    });

    $scope.eventMembers = _.map(usersInEvent.concat(teamsInEvent), function(item) { return normalize(item); });

    var teamsNotInEvent = _.filter($scope.teams, function(team) {
      return $scope.event.teamIds.indexOf(team.id) === -1 && !team.teamEventId;
    });
    var usersNotInEvent = _.reject(result.users.data, function(user) {
      return _.findWhere(eventTeam.users, {id: user.id});
    });
    $scope.eventNonMembers = _.map(usersNotInEvent.concat(teamsNotInEvent), function(item) { return normalize(item); });

    $scope.layer = {};
    $scope.eventLayers = _.map($scope.event.layerIds, function(layerId) { return layersById[layerId]; });
    $scope.nonLayers = _.filter($scope.layers, function(layer) {
      return $scope.event.layerIds.indexOf(layer.id) === -1;
    });

  });

  function saveEvent(event) {
    event.$save({populate: false});
  }

  $scope.filterMembers = function(item) {
    var filteredMembers = $filter('filter')([item], $scope.memberSearch);
    return filteredMembers && filteredMembers.length;
  };

  $scope.filterLayers = function(layer) {
    var filteredLayers = $filter('filter')([layer], $scope.layerSearch);
    return filteredLayers && filteredLayers.length;
  };

  $scope.addMember = function(member) {
    member.type === 'user' ? addUser(member) : addTeam(member);
  };

  function addTeam(team) {
    $scope.member = {};
    $scope.event.teamIds.push(team.id);
    $scope.eventMembers.push(team);
    $scope.eventNonMembers = _.reject($scope.eventNonMembers, function(item) { return item.id === team.id; });

    saveEvent($scope.event);
  }

  function addUser(user) {
    $scope.member = {};
    $scope.eventMembers.push(user);
    $scope.eventNonMembers = _.reject($scope.eventNonMembers, function(item) { return item.id === user.id; });

    eventTeam.users.push({id: user.id});
    eventTeam.$save();
  }

  $scope.removeMember = function(member) {
    member.type === 'user' ? removeUser(member) : removeTeam(member);
  };

  function removeTeam(team) {
    $scope.event.teamIds = _.reject($scope.event.teamIds, function(teamId) {return teamId === team.id; });
    $scope.eventMembers = _.reject($scope.eventMembers, function(item) { return item.id === team.id; });
    $scope.eventNonMembers.push(team);

    saveEvent($scope.event);
  }

  function removeUser(user) {
    $scope.eventMembers = _.reject($scope.eventMembers, function(item) { return item.id === user.id; });
    $scope.eventNonMembers.push(user);

    eventTeam.users = _.reject(eventTeam.users, function(u) { return user.id === u.id; });
    eventTeam.$save();
  }

  $scope.addLayer = function(layer) {
    $scope.layer = {};
    $scope.event.layerIds.push(layer.id);
    $scope.eventLayers.push(layer);
    $scope.nonLayers = _.reject($scope.nonLayers, function(l) { return l.id === layer.id; });

    saveEvent($scope.event);
  };

  $scope.removeLayer = function(layer) {
    $scope.event.layerIds = _.reject($scope.event.layerIds, function(layerId) {return layerId === layer.id;});
    $scope.eventLayers = _.reject($scope.eventLayers, function(l) { return l.id === layer.id;});
    $scope.nonLayers.push(layer);

    saveEvent($scope.event);
  };

  $scope.editEvent = function(event) {
    $location.path('/admin/events/' + event.id + '/edit');
  };

  $scope.editForm = function(event) {
    $location.path('/admin/events/' + event.id + '/edit/form');
  };

  $scope.gotoMember = function(member) {
    var resource = member.type === 'user' ? 'users' : 'teams';
    $location.path('/admin/' + resource + '/' + member.id);
  };

  $scope.gotoLayer = function(layer) {
    $location.path('/admin/layers/' + layer.id);
  };

  $scope.completeEvent = function(event) {
    event.complete = true;
    event.$save(function(updatedEvent) {
      $scope.event = updatedEvent;
    });
  };

  $scope.activateEvent = function(event) {
    event.complete = false;
    event.$save(function() {
      event.complete = false;
    });
  };

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

        $scope.deleteEvent = function(event) {
          event.$delete(function() {
            $modalInstance.close(event);
          });
        };

        $scope.cancel = function () {
          $modalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function () {
      $location.path('/admin/events');
    });
  };
}
