'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, $location, $injector, appConstants, teams, levels, observationTypes, mageLib, FeatureService) {
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

  /* Booleans for the ng-show attribues on the panels, toggling these will show and hide the map panels (i.e. layers, observation, export). */
  $scope.showSettings = false;
  $scope.showGoToAddress = false;
  $scope.showRefresh = false;
  $scope.showLocations = false;
  $scope.showExport = false;
  $scope.showObservation = false;

  /* Observation related variables and enums */
  $scope.observationTab = 1;
  $scope.teams = teams; //the next few fill in the selects on the observation form
  $scope.levels = levels;
  $scope.observationTypes = observationTypes;
  $scope.team = teams[0]; // form items
  $scope.level = levels[0];
  $scope.observationType = observationTypes[0];
  $scope.unit = "";
  $scope.description = "";
  $scope.files = []; // pre upload
  $scope.attachments = []; // images loaded from the server
  $scope.progressVisible = false; // progress bar stuff
  $scope.progressVisible = 0;


  /* Uncomment the following block to enable the Tomnod layers */
  /*$scope.imageryLayers = [{
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
          $scope.zoom = 12;
          $scope.center = { lat: position.coords.latitude, lng: position.coords.longitude };
        });
      });
    }
  }

  $scope.$watch("observationId", function (oldValue, newValue) {
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

          $scope.showSettings = true;
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
      })
      .error(function(data, status, headers, config) {
        console.log("Error getting features for layer 'layer.name' : " + status);
      });
  }

  $scope.onImageryLayer = function(layer) {
    $scope.layer = layer;
  }


  /* Settings aka layer panel funcitons */
  $scope.openSettings = function () {
    console.log("in open settings");
    $scope.showSettings = true;
  }

  $scope.closeSettings = function () {
    console.log("closing settings");
    $scope.showSettings = false;
  }

  $scope.saveSettings = function () {
    console.log("saving settings");
    $scope.showSettings = false;
  }


  /* 
    The observation functions are a mix of copy pasta from the observation directive, hopefully cleaned up a bit
    and using the FeatureService. May need to be cleaned up after PDC.
  */
  $scope.newObservation = function () {
    console.log("in new observation");
    $scope.showObservation = true;
    $scope.observationId = {feature: { properties: {OBJECTID: -1}}};
  }

  $scope.cancelObservation = function () {
    $scope.showObservation = false;
    $scope.observationId = {feature: { properties: {OBJECTID: -1}}}; 
  }

  $scope.saveObservation = function () {
    // Build the observation object
    var operation = "";
    var obs = [{
      "geometry": {
        "x": $scope.marker.lng, 
        "y": $scope.marker.lat
      },
      "attributes": {
        "EVENTDATE":new Date().getTime(),
        "TYPE":$scope.observationType.title,
        "EVENTLEVEL":$scope.level.color,
        "TEAM":$scope.team.name,
        "DESCRIPTION":$scope.description,
        "EVENTCLEAR":0,
        "UNIT":$scope.unit
      }
    }];

    /* check to see if this is this an update or a new observation, if its an update, set the location and ID */
    if ($scope.observationId.feature.properties.OBJECTID > 0) {
      operation = "updateFeatures";
      obs.attributes.OBJECTID = $scope.observationId.feature.properties.OBJECTID;
      obs.geometry.x = $scope.observation.geometry.coordinates[0];
      obs.geometry.x = $scope.observation.geometry.coordinates[1];
    } else {
      operation = "addFeatures";
    }

    // make a call to the FeatureService
    FeatureService.saveObservation($scope.currentLayerId, obs, operation)
      .success(function (data) {
        console.log('observation created');
      });
  }
  

  /* Goto address, need to implement some geocoding like the android app does, otherwise pull it out for PDC. */
  $scope.openGotoAddress = function () {
    console.log("in goto address");
    $scope.showGoToAddress = true;
  }

  $scope.dismissGotoAddress = function () {
    console.log("in goto address");
    $scope.showGoToAddress = false;
  }


  /* Need to sort out how this works with the GeoJSON layers... */
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
    $scope.showRefresh = false;
  }


  /* Locations == FFT */
  $scope.openLocations = function() {
    console.log("in showLocations");
    $scope.showLocations = true;
  }

  $scope.dismissLocations = function() {
    console.log("in dismissLocations");
    $scope.showLocations = false;
  }


  /* Open and close the export dialog, and handle making the call to get the KML file. */
  $scope.openExport = function () {
    console.log("opening export");
    $scope.showExport = true;
  }

  $scope.closeExport = function () {
    console.log("closing export panel");
    $scope.showExport = false;
  }

  $scope.export = function () {
    console.log("exporting features to KML");
    $scope.closeExport();
  }


  // Calls to make when the page is loaded
  $scope.getFeatureLayers();
  //$scope.geolocate(); // this makes angular upset because there are 2 scope.applys running at the same time...
}
