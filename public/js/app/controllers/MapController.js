'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, $injector, appConstants, teams, levels, observationTypes, mageLib) {
  /* Some map defaults */
  $scope.center = { lat: 39.8282, lng: -98.5795 };
  $scope.marker = { lat: 39.8282, lng: -98.5795 };
  $scope.zoom = 4;
  $scope.points = [];
  $scope.multiMarkers = {};
  $scope.externalLayer = "";
  $scope.observationId = 0;
  $scope.newFeature = null;

  /* Data models for the settings */
  $scope.layers = [];
  $scope.baseLayers = [{name: "Open Street Map"}];
  $scope.featureLayers = [];
  $scope.imageryLayers = [];

  /* Commented out for PDC
  $scope.imageryLayers = [{
    id: 1,
    name: "Digital Globe St Louis Map", 
    enabled: false, 
    external: true,
    type: "imagery",
    url: "http://sip.tomnod.com/sip/c6754f6173d059ac82729b6243148a08/256/{z}/{x}/{y}.png",
    tms: false
  },{
    id: 2,
    name: "Digital Globe Oklahoma Map", 
    enabled: false, 
    external: true,
    type: "imagery",
    url: "http://s3.amazonaws.com/explorationlab/oktornado1/{z}/{x}/{y}.png",
    tms: true
  }];
  $scope.featureLayers = [{
    id: 3,
    name: "St Louis Crowd Rank", 
    enabled: false, 
    external: true,
    url: "https://mapperdev.tomnod.com/nod/api/stlouistornado/sage"
  },{
    id: 4,
    name: "Oklahoma Crowd Rank", 
    enabled: false, 
    external: true,
    url: "https://mapperdev.tomnod.com/nod/api/oktornado2/sage"
  }];*/

  $scope.currentLayerId = 0;
  $scope.baseLayer = $scope.baseLayers[0];

  $scope.geolocate = function () {
    console.log("in geolocate");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        console.log("lat " + position.coords.latitude + " lon " + position.coords.longitude);
        $scope.$apply(function() {
          $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
          $scope.zoom = 12;
        });
      });
    }
  }

  $scope.$watch("$scope.observationId", function (oldValue, newValue) {
    console.log("Observation ID changed " + $scope.observationId);
  }, true);

  $scope.getFeatureLayers = function () {
    $http.get(appConstants.rootUrl + '/FeatureServer/', {params: mageLib.getTokenParams()}).
      success(function (data, status, headers, config) {
          console.log('got layers');
          $scope.layers = data.layers;

          _.each(data.layers, function(layer) {
            $scope.featureLayers.unshift({
              id: layer.id,
              name: layer.name,
              url: appConstants.rootUrl + "/FeatureServer/" + layer.id + "/features/?properties=OBJECTID&access_token=" + mageLib.getLocalItem('token'),
              enabled: false
            });
          });

          $('#settings-panel').removeCl***REMOVED***('hide');
      }).
      error(function (data, status, headers, config) {
          $log.log("Error getting layers: " + status);
      });
  }

  $scope.onFeatureLayer = function(layer) {
    if (!layer.checked) {
      $scope.layer = layer;
      return;
    };

    var options = {
      method: "GET",
      url: layer.url,
      headers: {
        "Accepts": "application/json", 
        "Content-Type": "application/json"
      }
    }

    if (layer.external) {
      options.method = "JSONP",
      options.params = {
         "callback": "JSON_CALLBACK"
      }
    } 

    $http(options)
      .success(function(data, status, headers, config) {
        console.log('got points');
        layer.featureCollection = data;
        $scope.layer = layer;

          // var crowdrank = data.features;
          // var markers = $scope.multiMarkers;
          // for (var i = 0; i <  crowdrank.length; i++) {
          //   markers[crowdrank[i].properties.tag_id] = {
          //     lat: crowdrank[i].geometry.coordinates[1],
          //     lng: crowdrank[i].geometry.coordinates[0], 
          //     draggable: false, 
          //     id: crowdrank[i].properties.tag_id, 
          //     icon_url: crowdrank[i].properties.icon_url, 
          //     chip_url: crowdrank[i].properties.chip_url, 
          //     chip_bounds: crowdrank[i].properties.chip_bounds};
          // }
          // $scope.multiMarkers = markers;
      })
      .error(function(data, status, headers, config) {
        console.log("Error getting features for layer 'layer.name' : " + status);
      });
  }

  $scope.onImageryLayer = function(layer) {
    $scope.layer = layer;
  }

  $scope.openSettings = function () {
    console.log("in open settings");
    $('#settings-panel').removeCl***REMOVED***('hide');
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
    $scope.observationId = {feature: { properties: {OBJECTID: -1}}};
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
    // TODO refresh point for selected layers
  //   console.log("in refresh points");
  //   $('#refresh-panel').removeCl***REMOVED***('hide');
  //   $scope.multiMarkers = {};

  //   $http.get(appConstants.rootUrl + '/FeatureServer/' + $scope.currentLayerId + '/query?outFields=OBJECTID').
  //       success(function (data, status, headers, config) {
  //           console.log('got points');
  //           $scope.points = data.features;
  //           var markers = {};
  //           for (var i = 0; i <  $scope.points.length; i++) {
  //             console.log($scope.points[i].geometry.x + ", " + $scope.points[i].geometry.y);
  //             markers[$scope.points[i].attributes.OBJECTID] = {lat: $scope.points[i].geometry.y, lng: $scope.points[i].geometry.x,draggable: false, id: $scope.points[i].attributes.OBJECTID};
  //           }
  //           $scope.multiMarkers = markers;
  //       }).
  //       error(function (data, status, headers, config) {
  //           $log.log("Error getting layers: " + status);
  //       });

  //   $('#refresh-panel').addCl***REMOVED***('hide');
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

  // Calls to make when the page is loaded
  $scope.getFeatureLayers();
  //$scope.geolocate(); // this makes angular upset because there are 2 scope.applys running at the same time...
}
