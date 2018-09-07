module.exports = SetupController;

SetupController.$inject = ['$scope', '$http', '$location', 'UserService', 'api'];

function SetupController($scope, $http, $location, UserService, api) {
  $scope.account = {};

  var pages = ['account', 'device'];
  $scope.page = pages[0];

  $scope.passwordRequirements = {};

  var localAuthenticationStrategy = api.authenticationStrategies.local;
  if (localAuthenticationStrategy) {
    $scope.passwordRequirements.minLength = localAuthenticationStrategy.passwordMinLength;
  }

  $scope.form = {};

  $scope.next = function() {
    if ($scope.form[$scope.page].$invalid) {
      return;
    }

    var index = pages.indexOf($scope.page);
    $scope.page = pages[index + 1];
  };

  $scope.finish = function() {
    $http.post('/api/setup', $scope.account, {headers: { 'Content-Type': 'application/json' }}).success(function() {
      // login the user
      var self = this;
      UserService.signin({username: $scope.account.username, password: $scope.account.password}).then(function(response) {
        var user = response.user;

        UserService.authorize('local', user, false, {uid: $scope.account.uid});
      }, function(response) {
        self.showStatus = true;
        self.statusTitle = 'Error signing in';
        self.statusMessage = response.data || 'Please check your username and password and try again.';
        self.statusLevel = 'alert-danger';
      });
    }).error(function() {
    });
  };
}
