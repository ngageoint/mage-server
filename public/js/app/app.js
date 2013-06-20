'use strict';

var mage = angular.module("mage", ["ui.bootstrap", "leaflet-directive", "mage.***REMOVED***s"], function ($routeProvider, $locationProvider) {
  //var access = routingConfig.accessLevels;

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
