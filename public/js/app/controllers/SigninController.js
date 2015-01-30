'use strict';

function SigninController($scope, $location, UserService) {
  $scope.status = 0;

  $scope.signin = function () {
    UserService.login({username: this.username, p***REMOVED***word: this.p***REMOVED***word, uid: this.uid})
      .error(function (data, status, headers, config) {
        $scope.status = status;
      });
  }
}
