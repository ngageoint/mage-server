function NavController($rootScope, $scope) {
  $rootScope.$on('event:user', function(e, login) {
    $scope.token = login.token;
    $scope.myself = login.user;
    $scope.amAdmin = login.isAdmin;
  });

  $rootScope.$on('logout', function() {
    $scope.myself = null;
    $scope.amAdmin = null;
  });

  this.feedToggle = function() {
    this.toggleFeed = {
      foo: 'bar'
    };
  }
}

NavController.$inject = ['$rootScope', '$scope'];

module.exports = NavController;