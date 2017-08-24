angular
  .module('mage')
  .controller('AdminEventAccessController', AdminEventAccessController);

AdminEventAccessController.$inject = ['$scope', '$location', '$routeParams', '$q', '$filter', 'Event', 'EventAccess', 'UserService'];

function AdminEventAccessController($scope, $location, $routeParams, $q, $filter, Event, EventAccess, UserService) {
  var users = [];

  $scope.member = {};

  $scope.roles = [{
    name: 'GUEST',
    title: 'Guest',
    description: 'Read only access to this event.'
  },{
    name: 'MANAGER',
    title: 'Manager',
    description: 'Read and Update access to this event.'
  },{
    name: 'OWNER',
    title: 'Owner',
    description: 'Read, Update and Delete access to this event.'
  }];

  $q.all({users: UserService.getAllUsers(), event: Event.get({id: $routeParams.eventId, populate: false}).$promise}).then(function(result) {
    users = result.users;

    $scope.role = {
      selected: $scope.roles[0]
    };

    refreshMembers(result.event);
  });

  function refreshMembers(event) {
    $scope.event = event;

    var usersById = _.indexBy(users, 'id');

    $scope.eventMembers = _.map($scope.event.acl, function(access, userId) {
      var member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = {
        selected: _.find($scope.roles, function(role) { return role.name === access.role; })
      };

      return member;
    });

    $scope.nonMembers = _.reject(users, function(user) {
      return _.where($scope.eventMembers, {id: user.id}).length > 0;
    });

    $scope.owners = owners();
  }

  function owners() {
    return _.filter($scope.eventMembers, function(member) {
      return member.role.selected.name === 'OWNER';
    });
  }

  $scope.addMember = function(member, role) {
    EventAccess.update({
      eventId: $scope.event.id,
      userId: member.id,
      role: role.name
    }, function(event) {
      delete $scope.member.selected;
      refreshMembers(event);
    });
  };

  $scope.removeMember = function(member) {
    EventAccess.delete({
      eventId: $scope.event.id,
      userId: member.id
    }, function(event) {
      refreshMembers(event);
    });
  };

  $scope.updateRole = function(member, role) {
    EventAccess.update({
      eventId: $scope.event.id,
      userId: member.id,
      role: role.name
    }, function(event) {
      refreshMembers(event);
    });
  };

  $scope.gotoUser = function(member) {
    $location.path('/admin/users/' + member.id);
  };

  $scope.filterMembers = function(member) {
    var filteredMembers = $filter('filter')([member], $scope.memberSearch);
    return filteredMembers && filteredMembers.length;
  };
}
