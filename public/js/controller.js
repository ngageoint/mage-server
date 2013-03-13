'use strict';

angular.module("sage", ["ui", "leaflet-directive"]);

function MapController($scope, $log, $http, $injector) {
	$scope.center = { lat: 50, lng: 50 };
  $scope.marker = { lat: 50, lng: 50 };
  $scope.zoom = 4;

   if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
      $scope.zoom = 12;
    });
  }




	/*$http.jsonp('http://ec2-23-21-10-48.compute-1.amazonaws.com/sage/esriFeatureServer/v1/features/', {params: {"callback": "JSON_CALLBACK"},
      headers: {"Accepts": "application/json", "Content-Type": "application/json"}}).
      success(function (data, status, headers, config) {
          $scope.points = data;
          for(var i = 0; i < data.length; i++){
              console.log("Data: "+i+"= "+angular.toJson(data[i]));
          }
      }).
      error(function (data, status, headers, config) {
          $log.log("Error logging in got status: " + status);
      });
  });*/
	
  /*if (navigator.geolocation)
  {
    navigator.geolocation.getCurrentPosition(function(position) {
    	$scope.mapSerivce.setView(new L.latlng(position.coords.latitude, position.coords.longitude), 6, true);
    });
    
  }*/

  $scope.geolocate = function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        $scope.zoom = 12;
      });
    }
  }

  $scope.newObservation = function () {
    console.log("in new observation");
    $('#observation-panel').removeCl***REMOVED***('hide');
  }

  /* Hide the observation panel, and reset the fields for next time. */
  $scope.cancelObservation = function () {
    console.log("in new observation");
    // add code to send the observation to the server here
    $('#observation-panel').addCl***REMOVED***('hide');
  }

  /* Send the observation to the server */
  $scope.saveObservation = function () {
    console.log("in new observation");
    // add code to send the observation to the server here
    $('#observation-panel').addCl***REMOVED***('hide');
  }
}