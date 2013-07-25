'use strict';

var mage = angular.module(
  "mage", 
  ["ui.bootstrap", "leaflet-directive", "mage.***REMOVED***s", "mage.userService", "mage.deviceService", "mage.layerService", "mage.featureService", "mage.timerService", "mage.locationService", "mage.lib"], 
  function ($routeProvider, $locationProvider, $httpProvider) {
    $httpProvider.defaults.withCredentials = true;
    $httpProvider.defaults.headers.post  = {'Content-Type': 'application/x-www-form-urlencoded'};

    $routeProvider.when('/signin',
    {
      templateUrl:    'js/app/partials/signin.html',
      controller:     SigninController
    });
    $routeProvider.when('/signup',
    {
      templateUrl:    'js/app/partials/signup.html',
      controller:     SignupController
    });
    $routeProvider.when('/admin',
    {
      templateUrl:    'js/app/partials/admin.html',
      controller:     AdminController
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
    }
  );
})
