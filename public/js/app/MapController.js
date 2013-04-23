'use strict';

var sage = angular.module("sage", ["ui.bootstrap", "leaflet-directive", "sage.***REMOVED***s"]);

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, $injector, appConstants, teams, levels, observationTypes) {
	/* Some map defaults */
  $scope.center = { lat: 39.8282, lng: -98.5795 };
  $scope.marker = { lat: 39.8282, lng: -98.5795 };
  $scope.message = "Current Position";
  $scope.zoom = 4;
  $scope.points = [];
  $scope.multiMarkers = {};
  $scope.observationId = 0;

  /* Data models for the settings */
  $scope.baseMaps = [{type: "Open Street Map"}];
  $scope.layers = [];
  $scope.currentLayerId = 0;

  $(document).ready(function() {
    // handle desktop browsers so that they play nice with the bootstrap navbar.
    if($(window).width() > 767) {
      $('#map').css('height', ($(window).height() - 40));
      $('.leaflet-container').css('height', ($(window).height() - 40));
    }

    $http.get(appConstants.rootUrl + '/FeatureServer/').
        success(function (data, status, headers, config) {
            console.log('got layers');
            $scope.layers = data.layers;
            $('#layer-select-panel').removeCl***REMOVED***('hide');
        }).
        error(function (data, status, headers, config) {
            $log.log("Error getting layers: " + status);
        });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        $scope.zoom = 12;
      });
    }
  });

  $(window).resize(function () {
    if($(window).width() > 767) {
      $('#map').css('height', ($(window).height() - 40));
      $('.leaflet-container').css('height', ($(window).height() - 40));
    }
  }).resize();

  $scope.baseMap = $scope.baseMaps[0];

  $scope.geolocate = function () {
    console.log("in geolocate");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        $scope.zoom = 12;

      });
    }
  }


  $scope.$watch("$scope.observationId", function(oldValue, newValue) {
    console.log("Observation ID changed " + $scope.observationId);
  }, true); 

  $scope.openSettings = function () {
    console.log("in open settings");
    $('#settings-panel').removeCl***REMOVED***('hide');
  }

  $scope.selectLayer = function () {
    console.log("layer selected");
    $('#layer-select-panel').addCl***REMOVED***('hide');
    $scope.refreshPoints();
  }

  $scope.closeSettings = function () {
    console.log("in new observation");
    $('#settings-panel').addCl***REMOVED***('hide');
  }

  $scope.saveSettings = function () {
    console.log("in new observation");
    // add code to send the observation to the server here
    $('#settings-panel').addCl***REMOVED***('hide');
  }

  $scope.newObservation = function () {
    console.log("in new observation");
    //$('#observation-panel').removeCl***REMOVED***('hide');
    $scope.observationId = -1;
    console.log("in ctl, set observationId to: " +$scope.observationId);
  }
  
  $scope.openGotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').removeCl***REMOVED***('hide');
  }

  $scope.dismissGotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').addCl***REMOVED***('hide');
  }

  $scope.gotoAddress = function () {
    console.log("in goto address");
    $('#goto-address-panel').addCl***REMOVED***('hide');
  }

  $scope.refreshPoints = function () {
    console.log("in refresh points");
    $('#refresh-panel').removeCl***REMOVED***('hide');
    $scope.multiMarkers = {};
    $http.get(appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/query?outFields=OBJECTID').
        success(function (data, status, headers, config) {
            console.log('got points');
            $scope.points = data.features;
            var markers = {};
            for (var i = 0; i <  $scope.points.length; i++) {
              console.log($scope.points[i].geometry.x + ", " + $scope.points[i].geometry.y);
              markers[$scope.points[i].attributes.OBJECTID] = {lat: $scope.points[i].geometry.y, lng: $scope.points[i].geometry.x,draggable: false, id: $scope.points[i].attributes.OBJECTID};
            }
            $scope.multiMarkers = markers;
        }).
        error(function (data, status, headers, config) {
            $log.log("Error getting layers: " + status);
        });

    $('#refresh-panel').addCl***REMOVED***('hide');
  }

  $scope.dismissRefresh = function () {
    console.log("in refresh points");
    $('#refresh-panel').addCl***REMOVED***('hide');
  }

  $scope.fft = function() {
    $('#fft-panel').removeCl***REMOVED***('hide'); 
    console.log("inFFT");
  }

  $scope.dismissFft = function() {
    $('#fft-panel').addCl***REMOVED***('hide'); 
    console.log("inFFT");
  }
}
