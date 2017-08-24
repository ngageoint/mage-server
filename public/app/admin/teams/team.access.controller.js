angular
  .module('mage')
  .controller('AdminTeamAccessController', AdminTeamAccessController);

AdminTeamAccessController.$inject = ['$scope', '$location', '$routeParams', '$q', '$filter', 'Team', 'TeamAccess', 'UserService',];

function AdminTeamAccessController($scope, $location, $routeParams, $q, $filter, Team, TeamAccess, UserService) {

  var users = [];

  $q.all({users: UserService.getAllUsers(), team: Team.get({id: $routeParams.teamId, populate: false}).$promise}).then(function(result) {
    users = result.users;

    $scope.member = {
      role: 'GUEST'
    };

    refreshMembers(result.team);
  });

  function refreshMembers(team) {
    $scope.team = team;

    var usersById = _.indexBy(users, 'id');

    $scope.teamMembers = _.map($scope.team.acl, function(access, userId) {
      var member = _.pick(usersById[userId], 'displayName', 'avatarUrl', 'lastUpdated');
      member.id = userId;
      member.role = access.role;
      return member;
    });

    $scope.nonMembers = _.reject(users, function(user) {
      return _.where($scope.teamMembers, {id: user.id}).length > 0;
    });

    $scope.owners = owners();
  }

  function owners() {
    return _.filter($scope.teamMembers, function(member) {
      return member.role === 'OWNER';
    });
  }

  $scope.addMember = function(member, role) {
    TeamAccess.update({
      teamId: $scope.team.id,
      userId: member.id,
      role: role
    }, function(team) {
      delete $scope.member.selected;
      refreshMembers(team);
    });
  };

  $scope.removeMember = function(member) {
    TeamAccess.delete({
      teamId: $scope.team.id,
      userId: member.id
    }, function(team) {
      refreshMembers(team);
    });
  };

  $scope.updateRole = function(member, role) {
    TeamAccess.update({
      teamId: $scope.team.id,
      userId: member.id,
      role: role
    }, function(team) {
      refreshMembers(team);
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
