'use strict';

function SignupController($rootScope, $scope, $log, $http, $injector, $location, appConstants, UserService) {
  // The variables that get set when clicking a team or user in the list, these get loaded into the editor.
  console.log('up in the signin controller');

  $scope.user = {};
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  $scope.signup = function () {
    var user = {
      username: this.user.username,
      firstname: this.user.firstname,
      lastname: this.user.lastname,
      email: this.user.email,
      phone: this.user.phone,
      p***REMOVED***word: this.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: this.user.p***REMOVED***wordconfirm,
      avatar: $scope.avatar
    }

    // TODO throw in progress
    var progress = function(e) {
      if(e.lengthComputable){
        $scope.$apply(function() {
          $scope.uploading = true;
          $scope.uploadProgress = (e.loaded/e.total) * 100;
        });
      }
    }

    var complete = function(response) {
      $scope.$apply(function() {
        $scope.showStatusMessage("Success", "Account created, contact an administrator to activate your account.", "alert-success")
      });
    }

    var failed = function(data) {
      $scope.$apply(function() {
        $scope.showStatusMessage("There was a problem creating your account", data, "alert-error")
      });
    }

    UserService.signup(user, complete, failed, progress);
  }

  $scope.showStatusMessage = function (title, message, statusLevel) {
    $scope.statusTitle = title;
    $scope.statusMessage = message;
    $scope.statusLevel = statusLevel;
    $scope.showStatus = true;
  }

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.avatar = userAvatar;
  });
}
