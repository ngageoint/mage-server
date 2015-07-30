/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

angular
  .module("mage", [
    "ui.bootstrap",
    "ui.select",
    "minicolors",
    "ngSanitize",
    "ngRoute",
    "ngResource",
    "http-auth-interceptor"
  ]).config(config).run(run);

config.$inject = ['$routeProvider', '$locationProvider', '$httpProvider'];

function config($routeProvider, $locationProvider, $httpProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

  function resolveLogin(roles) {
    return {
      user: ['UserService', function(UserService) {
       return UserService.getMyself(roles);
     }]
    }
  }

  function checkLogin(roles) {
    return {
      user: ['UserService', function(UserService) {
        return UserService.checkLoggedInUser(roles);
      }]
    }
  }

  $routeProvider.when('/signin', {
    templateUrl:    'app/signin/signin.html',
    controller:     "SigninController",
    resolve: checkLogin()
  });
  $routeProvider.when('/signup', {
    templateUrl:    'app/signup/signup.html',
    controller:     "SignupController"
  });
  $routeProvider.when('/admin/:adminPanel?', {
    templateUrl:    'app/admin/admin.html',
    controller:     "AdminController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/debug-info', {
    templateUrl:    'app/debug/debug.html',
    controller:     "DebugController",
    resolve: resolveLogin(["ADMIN_ROLE"])
  });
  $routeProvider.when('/map', {
    templateUrl:    'app/mage/mage.html',
    controller:     "MageController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
  $routeProvider.when('/user', {
    templateUrl:    "app/user/user.html",
    controller:      "UserController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
  $routeProvider.when('/about', {
    templateUrl:    "/app/about/about.html",
    controller:     "AboutController",
    resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
  });
  $routeProvider.otherwise({
    redirectTo:     '/signin',
    controller:     "SigninController",
  });
}

run.$inject = ['$rootScope', '$modal', 'UserService', '$location', 'authService'];

function run($rootScope, $modal, UserService, $location, authService) {
  $rootScope.$on('event:auth-loginRequired', function() {
    if (!$rootScope.loginDialogPresented && $location.path() != '/' && $location.path() != '/signin' && $location.path() != '/signup') {
      $rootScope.loginDialogPresented = true;
      var modalInstance = $modal.open({
        backdrop: 'static',
        templateUrl: 'app/signin/signin-modal.html',
        controller: ['$scope', '$modalInstance', 'authService', function ($scope, $modalInstance, authService) {
          var oldUsername = UserService.myself && UserService.myself.username || undefined;
          $scope.login = function (data) {
            UserService.login(data).success(function(){
              if (data.username != oldUsername) {
                data.newUser = true;
              }
              authService.loginConfirmed(data);
              $rootScope.loginDialogPresented = false;
              $modalInstance.close($scope);
            }).error(function (data, status, headers, config) {
              $scope.status = status;
            });
          };

          $scope.cancel = function () {
            $rootScope.loginDialogPresented = false;
            $modalInstance.dismiss('cancel');
          };
        }]
      });

      modalInstance.result.then(function () {
      });
    }

  });

  $rootScope.$on('event:auth-loginConfirmed', function() {
  });
}
