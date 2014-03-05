'use strict';

/*

*/
function AdminController($scope, $log, $http, $location, $anchorScroll, $injector, $filter, appConstants, UserService, DeviceService, FormService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.currentAdminPanel = "user"; // possible values user, team, and device
  $scope.currentUserFilter = "all"; // possible values all, active, unregistered
  $scope.currentDeviceFilter = "all"; // possible values all, registered, unregistered

  $scope.users = [];
  $scope.filteredUsers = [];
  UserService.getAllUsers().
    success(function (data) {
      $scope.users = data;
      $scope.filteredUsers = $scope.users;
      $scope.userSearch();
    });

  $scope.roles = [];
  UserService.getRoles().
    success(function (data) {
      $scope.roles = data;
    });

  $scope.devices = [];
  $scope.filteredDevices = [];
  DeviceService.getAllDevices().
    success(function (data) {
      $scope.devices = data;
      $scope.filteredDevices = $scope.devices;
      $scope.deviceSearch();
    });
  
  $scope.team = {};
  $scope.user = {};
  $scope.device = {};

  $scope.teams = [
    {
      'id': "0",
      'teamName': "Fox Hound",
      'description': "Desert search and rescue group."
    },
    {
      'id': "1",
      'teamName': "Diamond Dogs",
      'description': "Urban search and rescue group."
    }
  ];

  $scope.forms = FormService.forms();

  // Edit form toggles
  $scope.showUserForm = false;
  $scope.showDeviceForm = false;
  $scope.showNewDeviceButton = true;
  $scope.showTeamForm = false;

  // Status message values
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';
  $scope.statusLevel = ''; // use the bootstrap alert cl***REMOVED***es for this value, alert-error, alert-success, alert-info. Leave it as '' for yellow


  /* Status message functions */
  /**
    @param {String} statusLevel - bootstrap alert cl***REMOVED***es: alert-error, alert-success, alert-info, or roll your own and add it to the css
  */
  $scope.showStatusMessage = function (title, message, statusLevel) {
    $scope.statusTitle = title;
    $scope.statusMessage = message;
    $scope.statusLevel = statusLevel;
    $scope.showStatus = true;
  }

  $scope.setShowStatus = function (visibility) {
    $scope.showStatus = visibility;
  }

  $scope.setShowUserForm = function (visibility) {
    $scope.showUserForm = visibility;
  }

  $scope.setShowDeviceForm = function (visibility) {
    $scope.showDeviceForm = visibility;
    $scope.showNewDeviceButton = !visibility;
  }

  $scope.setShowTeamForm = function (visibility) {
    $scope.showTeamForm = visibility;
  }

  /* Set the current activity, this will tell the directives which one of them should be visible at the moment. */
  $scope.changeCurrentPanel = function (panel) {
    console.log("change current panel " + panel);
    $scope.currentAdminPanel = panel;
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

  $scope.changeCurrentDeviceFilter = function (filter) {
    $scope.deviceQuery = '';
    $scope.currentDeviceFilter = filter;
    if (filter == 'all') {
      $scope.filteredDevices = $scope.devices;
    } else if ( filter == "registered") {
      $scope.filteredDevices = $scope.getRegisteredDevices($scope.devices);
    } else {
      $scope.filteredDevices = $scope.getUnregisteredDevices($scope.devices);
    }
  }

  $scope.userFilterCl***REMOVED*** = function (filter) {
    return filter === $scope.currentUserFilter ? 'active' : '';
  }

  $scope.deviceFilterCl***REMOVED*** = function (filter) {
    return filter === $scope.currentDeviceFilter ? 'active' : '';
  }

  /* Team admin functions */
  $scope.getTeams = function() {

  }

  $scope.newTeam = function() {
    $('#new-team-form').removeCl***REMOVED***('hide');
  }

  $scope.viewTeam = function(team) {
    $scope.team = team;
  }

  $scope.saveTeam = function() {
    console.log("saving team...");
  }

  /* User admin functions */
  $scope.saveUser = function () {
    if ($scope.user._id) {
      UserService.updateUser($scope.user);
      $scope.setShowUserForm(false);
      $scope.showStatusMessage("User updated", $scope.user.username + " saved", "alert-success");
    } else {
      UserService.createUser($scope.user).
      success(function (data, status, headers, config) {
        $scope.setShowUserForm(false);
        console.log('created user ' + data);
        $scope.showStatusMessage("User created", "Nice work!", "alert-success");
        $scope.users.push(data);
        // TODO this is somewhat of a hack for now, call filter fucntion so users appear
        $scope.userSearch();
      }).
      error(function (data, status, headers, config) {
        $scope.showStatusMessage("Unable to create user", data, "alert-error");
        console.log('Something bad happened while creating a user...' + status);
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
    user.role = userRole._id;
    UserService.updateUser(user)
      .success(function (data, status, headers, config) {

      });
  }

  $scope.deleteUser = function (user) {
    UserService.deleteUser(user)
      .success(function(data, status) {
        $scope.users = _.filter($scope.users, function(u) {
          return u._id !== user._id;
        });
        // TODO this is somewhat of a hack for now, call filter fucntion so users gets removed
        $scope.userSearch();
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
      if (!user.role) {
        result.push(user);
      }
    });
    return result;
  }

  $scope.getRegisteredUsers = function (users) {
    var result = [];
    angular.forEach(users, function (user) {
      if (user.role) {
        result.push(user);
      }
    });
    return result;
  }

  var searchMatch = function (haystack, needle) {
    if (!needle) {
      return true;
    } else if (!haystack) {
      return false;
    }

    return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
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


  /* Device admin functions */
  $scope.getDevices = function () {

  }

  $scope.newDevice = function () {

  }

  $scope.editDevice = function (device) {
    $scope.device = device;
    $scope.setShowDeviceForm(true);
    $scope.scrollTo('device-form');
  }

  $scope.saveDevice = function () {
    var device = $scope.device;

    if (device._id) {
      DeviceService.updateDevice(device)
        .success(function(data) {
          $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been updated.","alert-info");
          $scope.setShowDeviceForm(false);
        })
        .error(function(data) {
          $scope.showStatusMessage("Unable to update device", data, "alert-error");
        });
    } else {
      DeviceService.createDevice(device)
        .success(function (data) {
          $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been created.","alert-info");
          $scope.devices.push(data);
          $scope.setShowDeviceForm(false);
        })
        .error(function (data) {
          $scope.showStatusMessage("Unable to create device", data, "alert-error");
        });
    }
  }

  $scope.registerDevice = function(device) {
    DeviceService.registerDevice(device)
      .success(function(data, status) {
        $scope.showStatusMessage("Successfully registered device", "Device '" + device.uid + "' is now registered.","alert-info");
        device.registered = true;
      })
      .error(function(data, status) {
        $scope.showStatusMessage("Unable to register device", data, "alert-error");
      });
  }

  $scope.deleteDevice = function (device) {
    DeviceService.deleteDevice(device)
      .success(function() {
        $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been removed.","alert-info");
        $scope.devices = _.reject($scope.devices, function(d) { return d.uid === device.uid });
      })
      .error(function() {
        $scope.showStatusMessage("Unable to delete device", data, "alert-error");
      });
  }

  $scope.getUnregisteredDevices = function (devices) {
    var result = [];
    angular.forEach(devices, function (device) {
      if (device.registered == false) {
        result.push(device);
      }
    });
    return result;
  }

  $scope.getRegisteredDevices = function (devices) {
    var result = [];
    angular.forEach(devices, function (device) {
      if (device.registered == true) {
        result.push(device);
      }
    });
    return result;
  }

  $scope.deviceSearch = function () {
    $scope.filteredDevices = $filter('filter')($scope.devices, function (device) {
      if (searchMatch(device['name'], $scope.deviceQuery) || searchMatch(device['uid'], $scope.deviceQuery) || 
        searchMatch(device['description'], $scope.deviceQuery)) {
        return true;
      }
      return false;
    });

    if ($scope.currentDeviceFilter == 'registered') {
      $scope.filteredDevices = $scope.getRegisteredDevices($scope.filteredDevices);
    } else if ($scope.currentDeviceFilter == 'unregistered') {
      $scope.filteredDevices = $scope.getUnregisteredDevices($scope.filteredDevices);
    }
  }
}
