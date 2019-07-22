var _ = require('underscore');

module.exports = AdminEventController;

AdminEventController.$inject = ['$scope', '$location', '$filter', '$routeParams', '$q', '$uibModal', 'LocalStorageService', 'UserService', 'EventService', 'Event', 'Team', 'Layer'];

function AdminEventController($scope, $location, $filter, $routeParams, $q, $uibModal, LocalStorageService, UserService, EventService, Event, Team, Layer) {
  $scope.token = LocalStorageService.getToken();

  $scope.showArchivedForms = false;

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
      if (teamsById[teamId]) {
        return teamsById[teamId].teamEventId === $scope.event.id;
      }
    });
    eventTeam = teamsById[eventTeamId];

    var teamIdsInEvent = _.filter($scope.event.teamIds, function(teamId) {
      if (teamsById[teamId]) {
        return teamsById[teamId].teamEventId !== $scope.event.id;
      }
    });
    var teamsInEvent = _.map(teamIdsInEvent, function(teamId) { return teamsById[teamId]; });

    var usersInEvent = _.filter(result.users, function(user) {
      return _.findWhere(eventTeam.users, {id: user.id});
    });

    $scope.eventMembers = _.map(usersInEvent.concat(teamsInEvent), function(item) { return normalize(item); });

    var teamsNotInEvent = _.filter($scope.teams, function(team) {
      return $scope.event.teamIds.indexOf(team.id) === -1 && !team.teamEventId;
    });
    var usersNotInEvent = _.reject(result.users, function(user) {
      return _.findWhere(eventTeam.users, {id: user.id});
    });
    $scope.eventNonMembers = _.map(usersNotInEvent.concat(teamsNotInEvent), function(item) { return normalize(item); });

    $scope.layer = {};
    $scope.eventLayers = _.chain($scope.event.layerIds)
      .filter(function(layerId) {
        return layersById[layerId]; })
      .map(function(layerId) {
        return layersById[layerId];
      }).value();

    $scope.nonLayers = _.filter($scope.layers, function(layer) {
      return $scope.event.layerIds.indexOf(layer.id) === -1;
    });

    var myAccess = $scope.event.acl[UserService.myself.id];
    var aclPermissions = myAccess ? myAccess.permissions : [];

    $scope.hasReadPermission = _.contains(UserService.myself.role.permissions, 'READ_EVENT_ALL') || _.contains(aclPermissions, 'read');
    $scope.hasUpdatePermission = _.contains(UserService.myself.role.permissions, 'UPDATE_EVENT') || _.contains(aclPermissions, 'update');
    $scope.hasDeletePermission = _.contains(UserService.myself.role.permissions, 'DELETE_EVENT') || _.contains(aclPermissions, 'delete');
  });

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

    Event.addTeam({id: $scope.event.id}, team);
  }

  function addUser(user) {
    $scope.member = {};
    $scope.eventMembers.push(user);
    $scope.eventNonMembers = _.reject($scope.eventNonMembers, function(item) { return item.id === user.id; });

    eventTeam.users.push({id: user.id});
    eventTeam.$save(function() {
      $scope.event.$get({populate: false});
    });
  }

  $scope.removeMember = function(member) {
    member.type === 'user' ? removeUser(member) : removeTeam(member);
  };

  function removeTeam(team) {
    $scope.event.teamIds = _.reject($scope.event.teamIds, function(teamId) {return teamId === team.id; });
    $scope.eventMembers = _.reject($scope.eventMembers, function(item) { return item.id === team.id; });
    $scope.eventNonMembers.push(team);

    Event.removeTeam({id: $scope.event.id, teamId: team.id});
  }

  function removeUser(user) {
    $scope.eventMembers = _.reject($scope.eventMembers, function(item) { return item.id === user.id; });
    $scope.eventNonMembers.push(user);

    eventTeam.users = _.reject(eventTeam.users, function(u) { return user.id === u.id; });
    eventTeam.$save(function() {
      $scope.event.$get({populate: false});
    });
  }

  $scope.addLayer = function(layer) {
    $scope.layer = {};
    $scope.event.layerIds.push(layer.id);
    $scope.eventLayers.push(layer);
    $scope.nonLayers = _.reject($scope.nonLayers, function(l) { return l.id === layer.id; });

    Event.addLayer({id: $scope.event.id}, layer);
  };

  $scope.removeLayer = function(layer) {
    $scope.event.layerIds = _.reject($scope.event.layerIds, function(layerId) {return layerId === layer.id;});
    $scope.eventLayers = _.reject($scope.eventLayers, function(l) { return l.id === layer.id;});
    $scope.nonLayers.push(layer);

    Event.removeLayer({id: $scope.event.id, layerId: layer.id});
  };

  $scope.editEvent = function(event) {
    $location.path('/admin/events/' + event.id + '/edit');
  };

  $scope.editAccess= function(event) {
    $location.path('/admin/events/' + event.id + '/access');
  };

  $scope.editForm = function(event, form) {
    $location.path('/admin/events/' + event.id + '/forms/' + form.id);
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

  $scope.createForm = function() {
    $scope.formCreateOpen = {opened: true};
  };

  $scope.onFormCreateClose = function(form) {
    $scope.formCreateOpen = {opened: false};
    if (form.id) {
      $location.path(`/admin/events/${$scope.event.id}/forms/${form.id}`);
    } else {
      $location.search('form', JSON.stringify(form))
      $location.path(`/admin/events/${$scope.event.id}/forms/new/fields`);
    }
  }

  $scope.moveFormUp = function($event, form) {
    $event.stopPropagation();

    var forms = $scope.event.forms;

    var from = forms.indexOf(form);
    var to = from - 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    $scope.event.$save();
  };

  $scope.moveFormDown = function($event, form) {
    $event.stopPropagation();

    var forms = $scope.event.forms;

    var from = forms.indexOf(form);
    var to = from + 1;
    forms.splice(to, 0, forms.splice(from, 1)[0]);

    $scope.event.$save();
  };

  $scope.preview = function($event, form) {
    $event.stopPropagation();

    $uibModal.open({
      template: require('./event-form-preview.html'),
      resolve: {
        form: function () {
          return form;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'form', function ($scope, $uibModalInstance, form) {
        $scope.form = form;

        $scope.close = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });
  };

  $scope.deleteEvent = function() {
    var modalInstance = $uibModal.open({
      template: require('./event-delete.html'),
      resolve: {
        event: function () {
          return $scope.event;
        }
      },
      controller: ['$scope', '$uibModalInstance', 'event', function ($scope, $uibModalInstance, event) {
        $scope.event = event;

        $scope.deleteEvent = function(event) {
          event.$delete(function() {
            $uibModalInstance.close(event);
          });
        };

        $scope.cancel = function () {
          $uibModalInstance.dismiss('cancel');
        };
      }]
    });

    modalInstance.result.then(function () {
      $location.path('/admin/events');
    });
  };
}
