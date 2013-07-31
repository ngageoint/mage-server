'use strict';

function SigninController($scope, $location, UserService) {
  $scope.status = 0;

  $scope.signin = function () {
    UserService.signin({username: this.username, p***REMOVED***word: this.p***REMOVED***word, uid: this.uid})
      .error(function (data, status, headers, config) {
        $scope.status = status;
      });
  }
}
