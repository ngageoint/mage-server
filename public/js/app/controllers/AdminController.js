'use strict';

function AdminController($scope, $routeParams, $log, $http, $location, $anchorScroll, $injector, $filter, appConstants, UserService, DeviceService, EventService, Event, Layer, mageLib) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  $scope.currentAdminPanel = $routeParams.adminPanel || "user";
  $scope.currentUserFilter = "all"; // possible values all, active, unregistered
  $scope.currentDeviceFilter = "all"; // possible values all, registered, unregistered
  $scope.token = mageLib.getLocalItem('token');

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

  $scope.user = {};
  $scope.device = {};

  $scope.appConstants = appConstants;

  Event.query(function(events) {
    $scope.events = events;
  });

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

  /* User admin functions */
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
          $scope.deviceSearch();
        })
        .error(function (data) {
          $scope.showStatusMessage("Unable to create device", data, "alert-error");
        });
    }
  }

  $scope.registerDevice = function(device) {
    DeviceService.registerDevice(device)
      .success(function(data, status) {
        device.registered = true;
        device.registeredThisSession = true;
      })
      .error(function(data, status) {
        $scope.showStatusMessage("Unable to register device", data, "alert-error");
      });
  }

  $scope.deleteDevice = function (device) {
    DeviceService.deleteDevice(device)
      .success(function() {
        $scope.devices = _.reject($scope.devices, function(d) { return d.uid === device.uid });
        device.deleted = "true";
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

  $scope.refreshDevices = function() {
    $scope.devices = [];
    $scope.filteredDevices = [];
    DeviceService.getAllDevices().
      success(function (data) {
        $scope.devices = data;
        $scope.filteredDevices = $scope.devices;
        $scope.deviceSearch();
      });
  }
}
