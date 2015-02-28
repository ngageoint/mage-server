'use strict';

/* Fix for IE */
if (!Date.now) { Date.now = function() { return +(new Date); }; }

/* collapse main nav when a nav item is clicked. Matters when screen size is small */
$('#main-nav a').on('click', function(){
    $("#main-nav-collapse.btn-navbar:visible").click();
});

var mage = angular.module(
  "mage",
  [
    "$strap.directives",
    "ui.bootstrap",
    "mage.httpAuthService",
    "ngSanitize",
    "ngRoute",
    'ngResource',
    'ngQuickDate',
    "http-auth-interceptor"])
  .config(function ($routeProvider, $locationProvider, $httpProvider) {
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

    //$httpProvider.interceptors.push('HttpAuthService');

    var resolveLogin = function(roles) {
      return {
        user: function(UserService) {
         return UserService.getMyself(roles);
        }
      }
    }

    var checkLogin = function(roles) {
      return {
        user: function(UserService) {
          return UserService.checkLoggedInUser(roles);
        }
      }
    }

    $routeProvider.when('/signin',
    {
      templateUrl:    'app/partials/signin.html',
      controller:     "SigninController",
      resolve: checkLogin()
    });
    $routeProvider.when('/signup',
    {
      templateUrl:    'app/partials/signup.html',
      controller:     "SignupController"
    });
    $routeProvider.when('/admin/:adminPanel?',
    {
      templateUrl:    'app/partials/admin/admin.html',
      controller:     "AdminController",
      resolve: resolveLogin(["ADMIN_ROLE"])
    });
    $routeProvider.when('/debug-info',
    {
      templateUrl:    'app/partials/debug.html',
      controller:     "DebugController",
      resolve: resolveLogin(["ADMIN_ROLE"])
    });
    $routeProvider.when('/map',
    {
      templateUrl:    'app/partials/mage.html',
      controller:     "MageController",
      resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
    });
    $routeProvider.when('/user',
    {
      templateUrl:    "app/partials/user.html",
      controller:      "UserController",
      resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
    });
    $routeProvider.when('/about',
    {
      templateUrl:    "/app/partials/about.html",
      controller:     "AboutController",
      resolve: resolveLogin(["USER_ROLE", "ADMIN_ROLE"])
    });
    $routeProvider.otherwise(
    {
      redirectTo:     '/signin',
      controller:     "SigninController",
    }
  );
}).run(function($rootScope, $modal, UserService, $location, authService) {
  $rootScope.$on('event:auth-loginRequired', function() {

    if (!$rootScope.loginDialogPresented && $location.path() != '/' && $location.path() != '/signin' && $location.path() != '/signup') {
      $rootScope.loginDialogPresented = true;
      var modalInstance = $modal.open({
        backdrop: 'static',
        templateUrl: 'myModalContent.html',
        controller: function ($scope, $modalInstance, authService) {
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
        }
      });
      modalInstance.result.then(function () {
      }, function () {
      });
    }

  });
  $rootScope.$on('event:auth-loginConfirmed', function() {
  });
});
