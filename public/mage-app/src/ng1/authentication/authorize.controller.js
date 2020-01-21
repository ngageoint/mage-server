module.exports = AuthorizeController;

AuthorizeController.$inject = ['$scope', 'UserService'];

function AuthorizeController($scope, UserService) {
  $scope.status = 0;
  $scope.showStatus = false;
  $scope.statusTitle = '';
  $scope.statusMessage = '';

  $scope.authorize = function (authData) {
    UserService.authorize('login-gov', authData.uid).success(function(data) {
      console.log('success', data);
    }).error(function (data) {
      $scope.statusTitle = 'Invalid Device ID';
      $scope.statusMessage = data.errorMessage;
      $scope.statusLevel = 'alert-warning';
    });
  };

  $scope.cancel = function () {
  };
}
