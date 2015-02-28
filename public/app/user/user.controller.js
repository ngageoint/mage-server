angular
  .module('mage')
  .controller('UserController', UserController);

UserController.$inject =  ['$scope', '$location', '$timeout', 'UserService', 'user'];

function UserController($scope, $location, $timeout, UserService, user) {
  $scope.user = user;
  $scope.originalUser = angular.copy(user);
  $scope.p***REMOVED***wordStatus = {};
  $scope.showUserStatus = false;
  $scope.avatar = null;

  $scope.saveUser = function() {
    var user = {
      username: this.user.username,
      firstname: this.user.firstname,
      lastname: this.user.lastname,
      email: this.user.email,
      phone: this.user.phone,
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
        $scope.status("Success", "Your account information has been updated.", "alert-success");
      });
    }

    var failed = function(data) {
      $scope.$apply(function() {
        $scope.status("Error", data, "alert-danger");
      });
    }

    UserService.updateMyself(user, complete, failed, progress);
  }

  $scope.cancel = function() {
    $scope.user = angular.copy($scope.originalUser);
  }

  $scope.updateP***REMOVED***word = function() {
    if (!this.user.p***REMOVED***word) {
      $scope.p***REMOVED***wordStatus = {status: "error", msg: "p***REMOVED***word cannot be blank"};
      return;
    }

    if (this.user.p***REMOVED***word != this.user.p***REMOVED***wordconfirm) {
      $scope.p***REMOVED***wordStatus = {status: "error", msg: "p***REMOVED***words do not match"};
      return;
    }

    var user = {
      p***REMOVED***word: this.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: this.user.p***REMOVED***wordconfirm
    }

    UserService.updateMyP***REMOVED***word(user)
      .success(function(user) {
        $scope.user.p***REMOVED***word = "";
        $scope.user.p***REMOVED***wordconfirm = "";
        $scope.p***REMOVED***wordStatus = {status: "success", msg: "p***REMOVED***word successfully updated, redirecting to the login page"};

        $timeout(function() {
          $location.path('/signin');
        }, 5000);
      })
      .error(function(data, status) {
        $scope.p***REMOVED***wordStatus = {status: "error", msg: data};
      });
  }

  $scope.status = function (statusTitle, statusMessage, statusLevel) {
    $scope.statusTitle = statusTitle;
    $scope.statusMessage = statusMessage;
    $scope.statusLevel = statusLevel;
    $scope.showUserStatus = true;
  }

  $scope.$on('userAvatar', function(event, userAvatar) {
    $scope.avatar = userAvatar;
  });

}
