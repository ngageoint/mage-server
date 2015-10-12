angular
  .module('mage')
  .controller('SignupController', SignupController);

SignupController.$inject = ['$scope', '$location', 'UserService', 'ApiService'];

function SignupController($scope, $location, UserService, ApiService) {
  $scope.user = {};
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  ApiService.get(function(api) {
    $scope.thirdPartyStrategies = _.map(_.omit(api.authenticationStrategies, localStrategyFilter), function(strategy, name) {
      strategy.name = name;
      return strategy;
    });

    $scope.localAuthenticationStrategy = api.authenticationStrategies.local;
  });

  $scope.signup = function () {
    var user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      phone: this.user.phone,
      p***REMOVED***word: this.user.p***REMOVED***word,
      p***REMOVED***wordconfirm: this.user.p***REMOVED***wordconfirm
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

  $scope.signup = function(strategy) {
    UserService.oauthSignup(strategy).then(function(data) {
      $scope.showStatus = true;
      $scope.statusTitle = 'Account successfully created';
      $scope.statusMessage = 'Your account has been created.  You will be able to login once and administrator approves your account';
      $scope.statusLevel = 'alert-success';
    }, function(data) {
      $scope.showStatus = true;
      $scope.statusTitle = 'Error signing up';
      $scope.statusMessage = data.errorMessage;
      $scope.statusLevel = 'alert-danger';
    });
  }

  function localStrategyFilter(strategy, name) {
    return name === 'local';
  }
}
