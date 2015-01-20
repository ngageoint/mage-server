'use strict';

angular.module('mage').controller('AdminTeamsCtrl', function ($scope, appConstants, mageLib, Team, UserService, $filter) {
  $scope.appConstants = appConstants;
  $scope.token = mageLib.getLocalItem('token');
  $scope.currentTeamFilter = "all"; // possible values all, active, unregistered
  $scope.edit = false;

  $scope.filteredTeams = [];

  $scope.teams = [
{name: 'Team 1', description:'Some long description about the team can go here if you would like', members: [{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'},{name: 'Billy'}]},
    {name: 'Team 2'},
    {name: 'Team 3'},
    {name: 'Team 4'}
  ];
  Team.query(function(teams) {
    // $scope.teams = teams;
  });

  UserService.getAllUsers().success(function(data) {
    $scope.users = data;
  });

  // Edit form toggles
  $scope.showTeamForm = false;

  $scope.newTeam = function() {
    $scope.team = {};
  }

  $scope.editTeam = function(team) {
    $scope.team = team;
  }

  $scope.changeCurrentUserFilter = function (filter) {
    $scope.userQuery = '';
    $scope.currentUserFilter = filter;
    if (filter == 'all') {
      $scope.filteredUsers = $scope.users;
    } else if ( filter == "active") {
      $scope.filteredUsers = $scope.getRegisteredUsers($scope.users);
    } else {
      $scope.filteredUsers = $scope.getUnregisteredUsers($scope.users);
    }
  }

  $scope.userFilterCl***REMOVED*** = function (filter) {
    return filter === $scope.currentUserFilter ? 'active' : '';
  }

  $scope.saveUser = function () {
    var user = {
      username: $scope.user.username,
      firstname: $scope.user.firstname,
      lastname: $scope.user.lastname,
      email: $scope.user.email,
      phone: $scope.user.phone,
      p***REMOVED***word: this.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: this.user.p***REMOVED***wordconfirm,
      role: $scope.user.role,
      avatar: $scope.user.avatar,
      icon: $scope.user.icon
    }

    if ($scope.user._id) {
      UserService.updateUser($scope.user._id, user, function(response) {
        $scope.$apply(function() {
          $scope.showStatusMessage("User updated", $scope.user.username + " saved", "alert-success");
        });
      },
      function(data) {
        $scope.$apply(function() {
          $scope.showStatusMessage("Unable to update user", data, "alert-error");
        });
      },
      function(e) {
        if(e.lengthComputable){
          $scope.$apply(function() {
            $scope.uploading = true;
            $scope.uploadProgress = (e.loaded/e.total) * 100;
          });
        }
      });
    } else {
      UserService.createUser(user, function(response) {
        $scope.$apply(function() {
          $scope.setShowUserForm(false);
          $scope.showStatusMessage("User created", "Nice work!", "alert-success");
          $scope.users.push(response);
          // TODO this is somewhat of a hack for now, call filter fucntion so users appear
          $scope.userSearch();
        });
      },
      function(data) {
        $scope.$apply(function() {
          $scope.showStatusMessage("Unable to create user", data, "alert-error");
        });
      },
      function(e) {
        if(e.lengthComputable){
          $scope.$apply(function() {
            $scope.uploading = true;
            $scope.uploadProgress = (e.loaded/e.total) * 100;
          });
        }
      });
    }
  }

  $scope.scrollTo = function (id) {
    var old = $location.hash();
    $location.hash(id);
    $anchorScroll();
    $location.hash(old);
  }

  $scope.editUser = function (user) {
    // TODO temp code to convert array of phones to one phone
    if (user.phones && user.phones.length > 0) {
      user.phone = user.phones[0].number;
    }

    $scope.user = user;
    $scope.setShowUserForm(true);
    $scope.scrollTo('user-form');
  }

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.user.avatar = userAvatar;
  });

  $scope.$on('userIcon', function(event, userIcon) {
    $scope.user.icon = userIcon;
  });

  $scope.newUser = function() {
    $scope.user = {};
    $scope.setShowUserForm(true);
  }

  $scope.viewUser = function(user) {
    $scope.user = new UserService.user(user);
  }

  /* shortcut for giving a user the USER_ROLE */
  $scope.approveUser = function (user) {
    var userRole = _.find($scope.roles, function (role) { return role.name == 'USER_ROLE' });
    user.active = true;
    UserService.updateUser(user._id, user, function() {});
  }

  $scope.deleteUser = function (user) {
    UserService.deleteUser(user)
      .success(function(data, status) {
        $scope.users = _.filter($scope.users, function(u) {
          return u._id !== user._id;
        });
        // TODO this is somewhat of a hack for now, call filter fucntion so users gets removed
        //$scope.userSearch();
        user.deleted="true";
        $scope.showStatusMessage("User deleted", user.username + " has been successfully deleted", "alert-success");
      });
  }

  $scope.getUserDisplayName = function(id) {
    var user = _.find($scope.users, function(user) {
      return user._id == id;
    });

    return user ? user.firstname + " " + user.lastname : "";
  }

  $scope.getUnregisteredUsers = function (users) {
    var result = [];
    angular.forEach(users, function (user) {
      if (!user.active) {
        result.push(user);
      }
    });
    return result;
  }

  $scope.getRegisteredUsers = function (users) {
    var result = [];
    angular.forEach(users, function (user) {
      if (user.active) {
        result.push(user);
      }
    });
    return result;
  }

  var searchMatch = function (property, query) {
    if (!query) {
      return true;
    } else if (!property) {
      return false;
    }

    return property.toLowerCase().indexOf(query.toLowerCase()) !== -1;
  };

  $scope.userSearch = function () {
    $scope.filteredUsers = $filter('filter')($scope.users, function (user) {
      if (searchMatch(user['username'], $scope.userQuery) || searchMatch(user['firstname'], $scope.userQuery) ||
        searchMatch(user['lastname'], $scope.userQuery) || searchMatch(user['email'], $scope.userQuery)) {
        return true;
      }
      return false;
    });

    if ($scope.currentUserFilter == 'active') {
      $scope.filteredUsers = $scope.getRegisteredUsers($scope.filteredUsers);
    } else if ($scope.currentUserFilter == 'unregistered') {
      $scope.filteredUsers = $scope.getUnregisteredUsers($scope.filteredUsers);
    }
  }

  $scope.refreshUsers = function() {
    $scope.users = [];
    $scope.filteredUsers = [];
    UserService.getAllUsers().
      success(function (data) {
        $scope.users = data;
        $scope.filteredUsers = $scope.users;
        $scope.userSearch();
      });
  }
});
