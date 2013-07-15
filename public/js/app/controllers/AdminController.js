'use strict';

/*

*/
function AdminController($scope, $log, $http, $location, $anchorScroll, $injector, appConstants, UserService, DeviceService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.currentAdminPanel = "user"; // possible values user, team, and device
  
  $scope.users = [];
  UserService.getAllUsers().
    success(function (data) {
      $scope.users = data;
    }).
    error(function (data, status, headers, config) {
      // if the user does not have admin permissions, re-route them to the signin page
      if (status == 401) {
        $location.path('/');
      }
    });

  $scope.roles = [];
  UserService.getRoles().
    success(function (data) {
      $scope.roles = data;
    }).
    error(function (data, status, headers, config) {
      // if the user does not have admin permissions, re-route them to the signin page
      if (status == 401) {
        $location.path('/');
      }
    });

  $scope.devices = [];
  DeviceService.getAllDevices().
    success(function (data) {
      $scope.devices = data;
    }).
    error(function (data, status, headers, config) {
      // if the user does not have admin permissions, re-route them to the signin page
      if (status == 401) {
        $location.path('/');
      }
    });
  
  $scope.team = {};
  $scope.user = {};

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

  // Edit form toggles
  $scope.showUserForm = false;
  $scope.showDeviceForm = false;
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
    $scope.$apply();
  }

  $scope.setShowStatus = function (visibility) {
    $scope.showStatus = visibility;
    $scope.$apply();
  }

  $scope.setShowUserForm = function (visibility) {
    $scope.showUserForm = visibility;
    $scope.$apply();
  }

  $scope.setShowDeviceForm = function (visibility) {
    $scope.showDeviceForm = visibility;
    $scope.$apply();
  }

  $scope.setShowTeamForm = function (visibility) {
    $scope.showTeamForm = visibility;
    $scope.$apply();
  }

  /* Set the current activity, this will tell the directives which one of them should be visible at the moment. */
  $scope.changeCurrentPanel = function (panel) {
    console.log("change current panel " + panel);
    $scope.currentAdminPanel = panel;
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

  $scope.signup = function () {
    UserService.signup($scope.user).
      success(function (data, status, headers, config) {
        console.log('created user ' + data);
        $scope.showStatusMessage("Account created", "Contact an administrator to activate your account.", "alert-success");
        $scope.user = {};
      }).
      error(function (data, status, headers, config) {
        console.log('created user ' + data);
        $scope.showStatusMessage("There was a problem creating your account", data, "alert-error");
      });
  }

  /* User admin functions */
  $scope.saveUser = function () {
    if ($scope.user._id) {
      UserService.updateUser($scope.user);
    } else {
      UserService.createUser($scope.user).
      success(function (data, status, headers, config) {
        $scope.setShowUserForm(false);
        console.log('created user ' + data);
        $scope.showStatusMessage("User created", "Nice work!", "alert-success");
        $scope.users.push(data);
      }).
      error(function (data, status, headers, config) {
        $scope.showStatusMessage("Unable to create user", data, "alert-error");
        console.log('Something bad happened while creating a user...' + status);
        // if the user does not have admin permissions, re-route them to the signin page
        if (status == 401) {
          $location.path('/');
        }
      });
    }
  }

  $scope.scrollTo = function (id) {
    $location.hash(id);
    $anchorScroll();
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
    //UserService.set
  }

  $scope.deleteUser = function () {

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
        })
        .error(function(data) {
          $scope.showStatusMessage("Unable to update device", data, "alert-error");
        });
    } else {
      DeviceService.createDevice(device)
        .success(function (data) {
          $scope.showStatusMessage("Success", "Device '" + device.uid + "' has been created.","alert-info");
          $scope.devices.push(data);
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
}
