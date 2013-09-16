'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($scope, $log, $http, appConstants, mageLib, IconService, UserService, MapService, LayerService, FeatureService, LocationService, TimerService) {
  $scope.customer = appConstants.customer;

  $scope.locate = false;
  $scope.broadcast = false;
  $scope.loadingLayers = {};

  /* Some map defaults */
  $scope.observation = {};

  /* Booleans for the ng-show attribues on the panels, toggling these will show and hide the map panels (i.e. layers, observation, export). */
  $scope.showSettings = true;
  $scope.showGoToAddress = false;
  $scope.showRefresh = false;
  $scope.showLocations = false;
  $scope.showExport = false;

  /* Observation related variables and enums */
  $scope.observationTab = 1;
  $scope.files = []; // pre upload
  $scope.attachments = []; // images loaded from the server
  $scope.progressVisible = false; // progress bar stuff
  $scope.progressVisible = 0;

  $scope.locationServicesEnabled = false;
  $scope.locations = [];

  $scope.showListTool = false;
  $scope.iconTag = function(feature) {
    return IconService.iconHtml(feature, $scope);
  }

  $scope.currentLayerId = 0;

  $scope.setActiveFeature = function(feature, layer) {    
    $scope.activeFeature = {feature: feature, layerId: layer.id, featureId: feature.properties.OBJECTID};
    $scope.featureTableClick = {feature: feature, layerId: layer.id, featureId: feature.properties.OBJECTID};
  }

  $scope.locationClick = function(location) {
    $scope.locationTableClick = location;
  }

  $scope.exportLayers = [];
  $scope.baseLayers = [];
  $scope.featureLayers = [];
  $scope.imageryLayers = []; 

  LayerService.getAllLayers().
    success(function (layers, status, headers, config) {
      // Pull out all non-base map imagery layers
      $scope.imageryLayers = _.filter(layers, function(layer) {
        return layer.type == 'Imagery' && !layer.base;
      });
      // Pull out all feature layers
      $scope.featureLayers = _.filter(layers, function(layer) {
        return layer.type == 'Feature';
      });
      // Pull out all imagery layers
      $scope.baseLayers = _.filter(layers, function(layer) {
        return layer.type == 'Imagery' && layer.base;
      });
      // Pull out all the external layers
      $scope.externalLayers = _.filter(layers, function(layer) {
        return layer.type == 'External';
      });

      // Default the base layer to first one in the list
      $scope.baseLayer = $scope.baseLayers[0];
    });

  $scope.onFeatureLayer = function(layer) {
    if (!layer.checked) {
      $scope.layer = {id: layer.id, checked: false};
      return;
    };

    $scope.loadingLayers[layer.id] = true;

    FeatureService.getFeatures(layer.id)
      .success(function(features) {
        $scope.layer = {id: layer.id, checked: true, features: features};
        $scope.loadingLayers[layer.id] = false;
      });
  }

  $scope.onImageryLayer = function(layer) {
    if (layer.checked) {
      $scope.layer = layer;
    } else {
      $scope.layer = {id: layer.id, checked: false};
    }
  }

  /* Settings aka layer panel funcitons */
  $scope.openSettings = function () {
    $scope.showSettings = true;
  }

  $scope.closeSettings = function () {
    $scope.showSettings = false;
  }

  $scope.toggleLocate = function() {
    $scope.locate = !$scope.locate;

    // if I am turning off locate and broadcast is
    // on, then turn off broadcast too.
    if (!$scope.locate && $scope.broadcast) {
      $scope.toggleBroadcast();
    }
  }

  /* Locations, think Find My Friends */
  // $scope.broadcastLocation = function () {
  $scope.toggleBroadcast = function() {
    var timerName = 'broadcastLocation';
    $scope.broadcast = !$scope.broadcast;

    if ($scope.broadcast) {
      $scope.locate = true;

      TimerService.start(timerName, 5000, function() {
        if (!$scope.location) return;

        var properties = {};
        if ($scope.location.accuracy) properties.accuracy = $scope.location.accuracy;
        if ($scope.location.altitude) properties.altitude = $scope.location.altitude;
        if ($scope.location.altitudeAccuracy) properties.altitudeAccuracy = $scope.location.altitudeAccuracy;
        if ($scope.location.heading) properties.heading = $scope.location.heading;
        if ($scope.location.speed) properties.speed = $scope.location.speed;

        var location = {
          location: {
            type: "Feature",
            geometry: {
              type: 'Point',
              coordinates: [$scope.location.longitude, $scope.location.latitude]
            },
            properties: properties
          },
          timestamp: new Date()
        };

        LocationService.createLocation(location)
          .success(function (data, status, headers, config) {
            $scope.positionBroadcast = location;
          });
      });
    } else {
      TimerService.stop(timerName);
    }
  }

  $scope.checkCurrentMapPanel = function (mapPanel) {
    return MapService.getCurrentMapPanel() == mapPanel;
  }

  $scope.setCurrentMapPanel = function (mapPanel) {
    MapService.setCurrentMapPanel(mapPanel);
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

  /* location ***REMOVED***s is FFT */
  $scope.locationServices = function() {
    var timerName = 'pollLocation';

    if ($scope.locationServicesEnabled) {
      TimerService.start(timerName, 5000, function() {
      LocationService.getLocations().
        success(function (data, status, headers, config) {
          _.each(data, function(userLocation) {
              UserService.getUser(userLocation.user)
                .then(function(user) {
                  userLocation.userModel = user.data || user;
                });
              
            });
          $scope.locations = data;
        }).
        error(function () {
          console.log('error getting locations');
        });
      });
    } else {
      $scope.locations = [];
      TimerService.stop(timerName);
    }
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

  /* Export existing points to  */
  $scope.export = function () {
    console.log("exporting features to KML");
     
    //error checking...
    $("#export-error-message").hide();
    if(!$scope.fft_layer && $scope.exportLayers.length == 0) {
      $("#export-error-message").html('Error: Please Select a Layer.');
      $("#export-error-message").show();
      return;
    }

    var url = appConstants.rootUrl + "/api/export" + 
      "?access_token=" + mageLib.getLocalItem('token') +
      "&time_filter=" + $scope.time_filter;
      
    if($scope.fft_layer) {
        url = url + "&fft_layer=" + $scope.fft_layer;
    }

    if($scope.exportLayers.length > 0) {
      var layer_ids = _.map($scope.exportLayers,function(layer){return layer.id}).join();
      url = url + "&export_layers=" + layer_ids;
    }

    window.location.href = url;
  }

  $scope.addExportLayer = function (layer) {
    $scope.exportLayers.push(layer);
  }
}