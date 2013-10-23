'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($rootScope, $scope, $log, $http, appConstants, mageLib, IconService, UserService, DataService, MapService, LayerService, LocationService, Location, TimerService, Feature) {
  $scope.customer = appConstants.customer;
  var ds = DataService;
  $scope.ms = MapService;

  $scope.locate = false;
  $scope.broadcast = false;
  $scope.loadingLayers = {};
  $scope.layerPollTime = 60000;

  /* Some map defaults */
  $scope.observation = {};

  /* Booleans for the ng-show attribues on the panels, toggling these will show and hide the map panels (i.e. layers, observation, export). */
  $scope.showSettings = false;
  $scope.showGoToAddress = false;
  $scope.showRefresh = false;
  $scope.showLocations = false;
  $scope.showExport = false;
  $scope.showFilter = true;
  $scope.pollTime = 30000;

  /* Observation related variables and enums */
  $scope.observationTab = 1;
  $scope.files = []; // pre upload
  $scope.attachments = []; // images loaded from the server
  $scope.progressVisible = false; // progress bar stuff
  $scope.progressVisible = 0;

  $scope.locationServicesEnabled = false;
  $scope.locations = [];
  $scope.locationPollTime = 5000;

  $scope.newsFeedEnabled = false;

  $scope.showListTool = false;
  $scope.iconTag = function(feature) {
    return IconService.iconHtml(feature, $scope);
  }

  $scope.currentLayerId = 0;

  $scope.setActiveFeature = function(feature, layer) {    
    $scope.activeFeature = {feature: feature, layerId: layer.id, featureId: feature.id};
    $scope.featureTableClick = {feature: feature, layerId: layer.id, featureId: feature.id};
  }

  $scope.locationClick = function(location) {
    $scope.locationTableClick = location;
    $scope.activeLocation = location;
  }

  $scope.$on('followUser', function(event, user) {
    $scope.ms.followedUser = $scope.ms.followedUser == user ? undefined : user;
  });

  $scope.$on('locationClick', function(event, location) {
    $scope.locationClick(location);
  });

  $scope.$on('observationClick', function(event, observation) {
    $scope.setActiveFeature(observation, {id: observation.layerId});
  });

  $scope.exportLayers = [];
  $scope.baseLayers = [];
  $scope.featureLayers = [];
  $scope.imageryLayers = []; 
  $scope.startTime = new Date();
  $scope.endTime = new Date();

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

      $scope.privateBaseLayers = _.filter($scope.baseLayers, function(layer) {
        if (layer.url.indexOf('private') == 0) {
          layer.url = layer.url + "?access_token=" + mageLib.getToken();
          return true;
        } else {
          return false;
        }
      });

      $scope.privateImageryLayers = _.filter($scope.imageryLayers, function(layer) {
        if (layer.url.indexOf('private') == 0) {
          layer.url = layer.url + "?access_token=" + mageLib.getToken();
          return true;
        } else {
          return false;
        }
      });

      // Default the base layer to first one in the list
      //$scope.baseLayer = $scope.baseLayers[0];
    });

  var createAllFeaturesArray = function() {
    var allFeatures = $scope.locations ? $scope.locations : [];
    _.each($scope.featureLayers, function(layer) {
      if (layer.checked) {
        console.info('add the features from ' + layer.name);
        allFeatures = allFeatures.concat(layer.features);
      } else {
        console.info('layer ' + layer.name + ' is not checked');
      }
    });
    $scope.feedItems = allFeatures;
  }

  var loadLayer = function(id) {
    $scope.loadingLayers[id] = true;

    var features = Feature.getAll({layerId: id/*, startTime: moment($scope.slider[0]).utc().format("YYYY-MM-DD HH:mm:ss"), endTime: moment($scope.slider[1]).utc().format("YYYY-MM-DD HH:mm:ss")*/}, function() {
      $scope.loadingLayers[id] = false;
      console.info('loaded the features', features);
      
      _.each(features.features, function(feature) {
        feature.layerId = id;
      });
      var featureLayer = _.find($scope.featureLayers, function(layer) {
        return layer.id == id;
      });
      featureLayer.features = features.features;
      $scope.layer.features = features;
      createAllFeaturesArray();
      //$scope.feedItems = _.flatten([$scope.locations ? $scope.locations : [], $scope.layer.features.features]);
    });

    $scope.layer = {id: id, checked: true};
  };

  $rootScope.$on('event:auth-loginConfirmed', function() {
    _.each($scope.privateBaseLayers, function(layer) {
      layer.url = layer.url.replace(/\?access_token=\w+/,"?access_token=" + mageLib.getToken());
    });
    _.each($scope.privateImageryLayers, function(layer) {
      layer.url = layer.url.replace(/\?access_token=\w+/,"?access_token=" + mageLib.getToken());
    });
  });



  $scope.onFeatureLayer = function(layer) {
    var timerName = 'pollLayer'+layer.id;
    if (!layer.checked) {
      $scope.layer = {id: layer.id, checked: false};
      var featureLayer = _.find($scope.featureLayers, function(l) {
        return l.id == layer.id;
      });
      featureLayer.features = [];
      createAllFeaturesArray();
      // TimerService.stop(timerName);
      //return;
    } else {
      loadLayer(layer.id);
    }

    // TimerService.start(timerName, $scope.layerPollTime || 300000, function() {
    //   loadLayer(layer.id);
    // });
  }

  // $scope.$watch('layerPollTime', function() {
  //   if ($scope.layerPollTime && $scope.layer) {
  //     if ($scope.layerPollTime == 0) {
  //       TimerService.stop('pollLayer'+$scope.layer.id);
  //       return;
  //     }
  //     $scope.onFeatureLayer($scope.layer);
  //   }
  // });

  var getUserLocations = function() {
    ds.locationsLoaded = false;
    ds.locations = Location.get({/*startTime: $scope.startTime, endTime: $scope.endTime*/}, function(success) {
      ds.locationsLoaded = true;
      $scope.locations = ds.locations;
      createAllFeaturesArray();
      //$scope.feedItems = _.flatten([$scope.locations, $scope.layer && $scope.layer.features ? $scope.layer.features.features : []]);
      _.each($scope.locations, function(userLocation) {
        if ($scope.ms.followedUser == userLocation.user) {
          if(!$scope.ms.lastFollowedLocation || 
              $scope.ms.lastFollowedLocation.locations[0].properties.timestamp != userLocation.locations[0].properties.timestamp) {
            $scope.ms.lastFollowedLocation = userLocation;
            $scope.locationClick(userLocation);
          }
        }
        UserService.getUser(userLocation.user)
          .then(function(user) {
            userLocation.userModel = user.data || user;
          });
          
        });
    });
  }

  var pollTheData = function() {
    if ($scope.pollTime == 0) {
      TimerService.stop('pollingData');
    } else {
      TimerService.start('pollingData', $scope.pollTime, function() {
        _.each($scope.featureLayers, function(layer) {
          if (layer.checked) {
            console.info('poll the feature layer', layer);
            loadLayer(layer.id);
          }
        });
        console.info('go poll the users layer');
        if ($scope.locationServicesEnabled) {
          getUserLocations();
        }
      });
    }
  }

  $scope.$watch('pollTime', pollTheData);

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

        var location = new Location({
          location: {
            type: "Feature",
            geometry: {
              type: 'Point',
              coordinates: [$scope.location.longitude, $scope.location.latitude]
            },
            properties: properties
          },
          timestamp: new Date()
        });

        $scope.positionBroadcast = location.$save();

        // LocationService.createLocation(location)
        //   .success(function (data, status, headers, config) {
        //     $scope.positionBroadcast = location;
        //   });
      });
    } else {
      TimerService.stop(timerName);
    }
  }

  $scope.checkCurrentMapPanel = function (mapPanel) {
    return MapService.getCurrentMapPanel() == mapPanel;
  }

  $scope.setCurrentMapPanel = function (mapPanel) {
    if (MapService.getCurrentMapPanel() == mapPanel) {
      MapService.setCurrentMapPanel('none');
    } else {
      MapService.setCurrentMapPanel(mapPanel);
    }
  }

  $scope.checkCurrentSidePanel = function (mapPanel) {
    return MapService.getCurrentSidePanel() == mapPanel;
  }

  $scope.setCurrentSidePanel = function (mapPanel) {
    if (MapService.getCurrentSidePanel() == mapPanel) {
      MapService.setCurrentSidePanel('none');
    } else {
      MapService.setCurrentSidePanel(mapPanel);
    }
  }

  $scope.newsFeed = function() {
      $scope.setCurrentSidePanel('newsFeed');
  }

  /* location ***REMOVED***s is FFT */
  $scope.locationServices = function() {
    var timerName = 'pollLocation';

    if ($scope.locationServicesEnabled) {
      getUserLocations();
      // TimerService.start(timerName, $scope.locationPollTime || 5000, function() {
      //   ds.locationsLoaded = false;
      //   ds.locations = Location.get({/*startTime: $scope.startTime, endTime: $scope.endTime*/}, function(success) {
      //     ds.locationsLoaded = true;
      //     $scope.locations = ds.locations;
      //     $scope.feedItems = _.flatten([$scope.locations, $scope.layer && $scope.layer.features ? $scope.layer.features.features : []]);
      //     console.info('ds', ds);
      //     _.each($scope.locations, function(userLocation) {
      //         UserService.getUser(userLocation.user)
      //           .then(function(user) {
      //             userLocation.userModel = user.data || user;
      //           });
              
      //       });
      //   });
      // });
    } else {
      $scope.locations = ds.locations = [];
      createAllFeaturesArray();
      //$scope.feedItems = $scope.layer && $scope.layer.features ? $scope.layer.features.features : [];
      //TimerService.stop(timerName);
    }
  }

  $scope.$watch('locationPollTime', function() {
    if ($scope.locationPollTime) {
      $scope.locationServices();
    }
  });

  $scope.newsFeedOrder = function(feedItem, a, b, c) {
    //console.info(feedItem);
    //console.info('news feed order');
    var time = feedItem.properties ? feedItem.properties.EVENTDATE : moment(feedItem.locations[0].properties.timestamp);
    time = time || Date.now();
    return time.valueOf();
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