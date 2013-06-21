'use strict';

var mage = angular.module("mage", ["ui.bootstrap", "leaflet-directive", "mage.***REMOVED***s", "mage.userService"], function ($routeProvider, $locationProvider, $httpProvider) {
  $httpProvider.defaults.withCredentials = true;
  $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

  // $http.defaults.headers.common['Auth-Token'] = 'token'; // going to need to sort out setting the token, see 

  $routeProvider.when('/signin',
  {
    templateUrl:    'js/app/partials/signin.html',
    controller:     SigninController
  });
  $routeProvider.when('/signup',
  {
    templateUrl:    'js/app/partials/signup.html',
    controller:     UserController
  });
  $routeProvider.when('/users',
  {
    templateUrl:    'js/app/partials/users.html',
    controller:     UserController
  });
  $routeProvider.when('/map',
  {
    templateUrl:    'js/app/partials/map.html', 
    controller:     MapController, 
  });
  $routeProvider.when('/layers', 
  {
    templateUrl:    "js/app/partials/layers.html",
    controller:      LayerController
  })
  $routeProvider.otherwise(
  {
    redirectTo:     '/signin',
    controller:     SigninController, 
  });
})
