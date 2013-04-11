'use strict';

angular.module("sage", ["ui", "leaflet-directive", "sage.***REMOVED***s"]);

/*
  
*/
function LayerController($scope, $log, $http, $injector, appConstants) {
  $scope.layers = [];
  $scope.layerName = "";

  $scope.getLayers = function() {
    console.log('getting layers...');
    //http://ec2-23-21-10-48.compute-1.amazonaws.com/sage
    $http.get('http://localhost:4242/FeatureServer/').
        success(function (data, status, headers, config) {
            $scope.layers = data.layers;
            if(data.layers.length == 0) {
              $('#instructions').removeCl***REMOVED***('hide');
            }
        }).
        error(function (data, status, headers, config) {
            $log.log("Error getting layers: " + status);
        });
  }

  $scope.newLayer = function () {
    console.log('in newLayer');
    $('#instructions').addCl***REMOVED***('hide');
    $('#new-layer-form').removeCl***REMOVED***('hide');
  }

  $scope.saveLayer = function () {
    console.log('in newLayer');
    
    $http.post(appConstants.rootUrl + '/FeatureServer/', "name=" + $scope.layerName, {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}).
      success(function (data, status, headers, config) {
          $scope.points = data;
          for(var i = 0; i < data.length; i++){
              console.log("Data: "+i+"= "+angular.toJson(data[i]));
          }
      }).
      error(function (data, status, headers, config) {
          $log.log("Error adding feature: " + status);
      });

    $('#new-layer-form').addCl***REMOVED***('hide');
    $scope.getLayers();
  }

  $scope.viewLayer = function () {
    console.log('in ieewLayer');
    //$scope.
  }

  $scope.getLayers();
}
