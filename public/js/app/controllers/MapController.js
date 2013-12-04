'use strict';

/*
  Handle communication between the server and the map.
  Load observations, allow users to view them, and allow them to add new ones themselves.
*/
function MapController($rootScope, $scope, $log, $http, ObservationService, FeatureTypeService, appConstants, mageLib, IconService, UserService, DataService, MapService, Layer, LocationService, Location, TimerService, Feature, TimeBucketService) {
  $scope.customer = appConstants.customer;
  var ds = DataService;
  $scope.ms = MapService;

  FeatureTypeService.getTypes().
    success(function (types, status, headers, config) {
      $scope.types = types;
    });

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

  $scope.newsFeedEnabled = true;

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

  Layer.query(function (layers, status, headers, config) {
      // Pull out all non-base map imagery layers
      $scope.imageryLayers = MapService.imageryLayers = _.filter(layers, function(layer) {
        return layer.type == 'Imagery' && !layer.base;
      });
      // Pull out all feature layers
      $scope.featureLayers = MapService.featureLayers = _.filter(layers, function(layer) {
        return layer.type == 'Feature';
      });
      // Pull out all imagery layers
      $scope.baseLayers = MapService.baseLayers = _.filter(layers, function(layer) {
        return layer.type == 'Imagery' && layer.base;
      });
      // Pull out all the external layers
      $scope.externalLayers = MapService.externalLayers = _.filter(layers, function(layer) {
        return layer.type == 'External';
      });

      $scope.privateBaseLayers = MapService.privateBaseLayer = _.filter($scope.baseLayers, function(layer) {
        if (layer.url.indexOf('private') == 0) {
          layer.url = layer.url + "?access_token=" + mageLib.getToken();
          return true;
        } else {
          return false;
        }
      });

      $scope.privateImageryLayers = MapService.privateImageryLayers = _.filter($scope.imageryLayers, function(layer) {
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

  var isEditing;
  $scope.newObservation = function () {
    if ($scope.newObservationEnabled) {
      $scope.newObservationEnabled = false;
      return;
    }
    $scope.newObservationEnabled = true;
    $scope.observationTab = 1;
    isEditing = false;
    $scope.observationCloseText = "Cancel";
    $scope.newFeature = ObservationService.createNewObservation();
    $scope.attachments = [];
    $scope.files = [];
  }

  $scope.$on('cancelEdit', function(event) {
    $scope.newObservationEnabled = false;
    isEditing = false;
  });

  $scope.$on('newObservationSaved', function(event, observation) {
    $scope.newObservationEnabled = false;
    isEditing = false;
    console.info('observation', observation);
    var featureLayer = _.find($scope.featureLayers, function(layer) {
      return layer.id == observation.layerId;
    });
    if (featureLayer) {
      var existingFeature = _.find(featureLayer.features, function(feature) {
        return feature.id == observation.id;
      });
      if (existingFeature) {
        existingFeature = observation;
      } else {
        featureLayer.features.push(observation);
      }
      // this has to change.  This is how the leaflet-directive knows to pick up new features, but it is not good
      $scope.layer.features = {features: featureLayer.features};
    }
    createAllFeaturesArray();
  });

  $scope.$on('observationDeleted', function(event, observation) {
    console.info('observation deleted', observation);
    // this triggers the leaflet-directive watch.  I don't like this either
    $scope.deletedFeature = observation;

    // this is the way it should be done.  update leaflet-directive to work this way
    var featureLayer = _.find($scope.featureLayers, function(layer) {
      return layer.id == observation.layerId;
    });
    if (featureLayer) {
      featureLayer.features = _.without(featureLayer.features, observation);
      // this has to change.  This is how the leaflet-directive knows to pick up new features, but it is not good
      $scope.layer.features = {features: featureLayer.features};
    }
    createAllFeaturesArray();
  });

  $scope.selectedBucket = 0;

  $scope.setBucket = function(index) {
    $scope.selectedBucket = index;
  }

  var createAllFeaturesArray = function() {
    var allFeatures = $scope.locations ? $scope.locations : [];
    _.each($scope.featureLayers, function(layer) {
      if (layer.checked) {
        allFeatures = allFeatures.concat(layer.features);
      }
    });
    $scope.feedItems = allFeatures;
    $scope.buckets = TimeBucketService.createBuckets(allFeatures, appConstants.newsFeedItemLimit(), function(item) {
      return item.properties ? item.properties.EVENTDATE : item.locations[0].properties.timestamp;
    }, 'newsfeed');
  }

  $scope.$watch("markerLocation", function(location) {
    if (!location) return;

    if (!isEditing && $scope.newObservationEnabled) {
      $scope.newFeature.geometry.coordinates = [location.lng, location.lat];
      $scope.newFeature.properties.EVENTDATE = new Date().getTime();
    }
  }, true);

  var loadLayer = function(id) {
    $scope.loadingLayers[id] = true;

    var features = Feature.getAll({layerId: id/*, startTime: moment($scope.slider[0]).utc().format("YYYY-MM-DD HH:mm:ss"), endTime: moment($scope.slider[1]).utc().format("YYYY-MM-DD HH:mm:ss")*/}, function(response) {
      $scope.loadingLayers[id] = false;
      
      _.each(features.features, function(feature) {
        feature.layerId = id;
      });
      var featureLayer = _.find($scope.featureLayers, function(layer) {
        return layer.id == id;
      });
      if (!featureLayer) {
        featureLayer = _.find($scope.externalLayers, function(layer) {
          return layer.id == id;
        });
      }
      featureLayer.features = features.features;
      // this has to change.
      $scope.layer.features = features;
      createAllFeaturesArray();

    }, function(response) {
      console.info('there was an error, code was ' + response.status);
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
      if (!featureLayer) {
        featureLayer = _.find($scope.externalLayers, function(l) {
          return l.id == layer.id;
        });
      }
      featureLayer.features = [];
      createAllFeaturesArray();
    } else {
      loadLayer(layer.id);
    }
  }

  var getUserLocations = function() {
    ds.locationsLoaded = false;
    ds.locations = Location.get({/*startTime: $scope.startTime, endTime: $scope.endTime*/}, function(success) {
      ds.locationsLoaded = true;
      $scope.locations = ds.locations;
      createAllFeaturesArray();
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
            loadLayer(layer.id);
          }
        });
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

        $scope.positionBroadcast = Location.create({
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

      });
    } else {
      TimerService.stop(timerName);
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
    } else {
      $scope.locations = ds.locations = [];
      createAllFeaturesArray();
    }
  }

  $scope.$watch('locationPollTime', function() {
    if ($scope.locationPollTime) {
      $scope.locationServices();
    }
  });

  $scope.newsFeedOrder = function(feedItem, a, b, c) {
    var time = feedItem.properties ? feedItem.properties.EVENTDATE : moment(feedItem.locations[0].properties.timestamp);
    time = time || Date.now();
    return time.valueOf();
  }

  $scope.dismissLocations = function() {
    console.log("in dismissLocations");
    $scope.showLocations = false;
  }
}