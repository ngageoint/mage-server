angular
  .module('mage')
  .controller('MageController', MageController);

MageController.$inject = ['$scope', '$compile', '$timeout', 'FilterService', 'EventService', 'MapService', 'PollingService', 'LocalStorageService', 'Layer', 'Observation', 'Location'];

function MageController($scope, $compile, $timeout, FilterService, EventService, MapService, PollingService, LocalStorageService, Layer, Observation, Location) {

  var observationsById = {};
  $scope.newsFeedObservations = [];
  $scope.newsFeedChangedObservations = 0;

  Layer.query(function (layers) {
    var baseLayerFound = false;
    _.each(layers, function(layer) {
      // Add token to the url of all private layers
      // TODO add watch for token change and reset the url for these layers
      if (layer.type === 'Imagery' && layer.url.indexOf('private') == 0) {
        layer.url = layer.url + "?access_token=" + LocalStorageService.getToken();
      }

      if (layer.type === 'Imagery') {
        layer.type = 'raster';

        if (layer.base && !baseLayerFound) {
          layer.options = {selected: true};
          baseLayerFound = true;
        }
      }

      MapService.createRasterLayer(layer);
    });
  });

  function onObservationsChanged(changed) {
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;

      MapService.addFeatureToLayer(added, 'Observations');
    });

    _.each(changed.updated, function(updated) {
      var observation = observationsById[updated.id];
      if (observation) {
        observation = updated;

        MapService.updateFeatureForLayer(observation, 'Observations');
      }
    });

    _.each(changed.removed, function(removed) {
      delete observationsById[removed.id];

      MapService.removeFeatureFromLayer(removed, 'Observations');

      var scope = popupScopes[removed.id];
      if (scope) {
        scope.$destroy();
        delete popupScopes[removed.id];
      }
    });

    // update the news feed observations
    $scope.newsFeedObservations = _.values(observationsById);

    if (changed.added) $scope.newsFeedChangedObservations += changed.added.length;
    if (changed.updated) $scope.newsFeedChangedObservations += changed.updated.length;
  }

  var observationsChangedListener = {
    onObservationsChanged: onObservationsChanged
  };
  EventService.addObservationsChangedListener(observationsChangedListener);

  var locationListener = {
    onLocation: onLocation
  };
  MapService.addListener(locationListener);

  $scope.$on('$destroy', function() {
    EventService.removeObservationsChangedListener(observationsChangedListener);
    MapService.removeListener(locationListener);
    PollingService.setPollingInterval(0); // stop polling
  });


  function onLocation(l) {
    var event = FilterService.getEvent();
    var location = Location.create({
      eventId: event.id,
      geometry: {
        type: 'Point',
        coordinates: [l.longitude, l.latitude]
      },
      properties: {
        timestamp: l.timestamp,
        accuracy: l.accuracy,
        altitude: l.altitude,
        altitudeAccuracy: l.altitudeAccuracy,
        heading: l.heading,
        speed: l.speed
      }
    });
  }

  var selectedObservationId = null;
  function onObservationSelected(observation, options) {
    // Prevent selected event for same observation
    if (selectedObservationId !== observation.id) {
      selectedObservationId = observation.id;
      $scope.$broadcast('observation:select', observation);
      MapService.selectFeatureInLayer(observation, 'Observations', options);
    }
  }

  function onObservationDeselected(observation) {
    selectedObservationId = null;
    $scope.$broadcast('observation:deselect', observation);
  }

  // TODO is there a better way to do this?
  // Need to hang onto popup scopes so that I can delete the scope if the observation
  // get deleted.  I.E. no observation, no popup so remove its scope
  // Possible user of leaflet templates to accomplish this in leaflet
  // rather than angular
  var popupScopes = {};
  var observationLayer = MapService.createVectorLayer({
    name: 'Observations',
    group: 'MAGE',
    type: 'geojson',
    options: {
      selected: true,
      cluster: true,
      popup: {
        html: function(observation) {
          var el = angular.element('<div observation-popup="observation" observation-popup-info="onInfo(observation)"></div>');
          var compiled = $compile(el);
          var newScope = $scope.$new(true);
          newScope.observation = observation;
          newScope.onInfo = function(observation) {
            $timeout(function() {
              onObservationSelected(observation);
            });
          }
          compiled(newScope);
          popupScopes[observation.id] = newScope;

          return el[0];
        },
        closeButton: false,
        onClose: function(observation) {
          $timeout(function() {
            onObservationDeselected(observation);
          });
        }
      }
    }
  });

  $scope.$on('observation:selected', function(e, observation, options) {
    onObservationSelected(observation, options);
  });

  var newObservation = null;
  $scope.$on('observation:create', function(e, latlng) {
    var event = FilterService.getEvent();

    newObservation = new Observation({
      eventId: event.id,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      },
      properties: {
        timestamp: new Date()
      }
    });

    MapService.createMarker(newObservation, {
      layerId: 'NewObservation',
      selected: true,
      draggable: true,
      onDragEnd: function(latlng) {
        $scope.$broadcast('observation:moved', newObservation, latlng);
        $scope.$apply();
      }
    });

    $scope.$broadcast('observation:new', newObservation);
    $scope.$apply();
  });

  $scope.$on('observation:editDone', function(e, observation) {
    if (newObservation === observation) {
      MapService.removeMarker(observation, 'NewObservation');
    }

    newObservation = null;
  });

  $scope.$on('observation:move', function(e, observation, latlng) {
    $scope.$broadcast('observation:moved', observation, latlng);
    MapService.updateMarker(observation, 'NewObservation');
  });

}

  // $scope.locate = false;
  // $scope.broadcast = false;
  // $scope.loadingLayers = {};
  // $scope.layerPollTime = 60000;

  // $scope.observation = {};

  // $scope.showSettings = false;
  // $scope.showGoToAddress = false;
  // $scope.showRefresh = false;
  // $scope.showLocations = false;
  // $scope.showExport = false;
  // $scope.showFilter = true;
  // $scope.pollTime = 30000;

  // $scope.observationTab = 1;
  // $scope.files = []; // pre upload
  // $scope.attachments = []; // images loaded from the server
  // $scope.progressVisible = false; // progress bar stuff
  // $scope.progressVisible = 0;

  // $scope.locationServicesEnabled = false;
  // $scope.hideLocationsFromNewsFeed = false;
  // $scope.locations = [];
  // $scope.locationPollTime = 5000;

  // $scope.newsFeedEnabled = true;

  // $scope.showListTool = false;

  // $scope.currentLayerId = 0;

  // $scope.setActiveFeature = function(feature, layer) {
  //   $scope.activeFeature = {feature: feature, layerId: layer.id, featureId: feature.id};
  //   $scope.featureTableClick = {feature: feature, layerId: layer.id, featureId: feature.id};
  //   $scope.activeLocation = undefined;
  //   $scope.locationTableClick = undefined;
  //   if ($scope.activeUserPopup) {
  //     $scope.activeUserPopup.closePopup();
  //   }
  // }

  // $scope.locationClick = function(location) {
  //   $scope.locationTableClick = location;
  //   $scope.activeLocation = location;
  //   $scope.activeFeature = undefined;
  //   $scope.featureTableClick = undefined;
  // }

  // $scope.$on('followUser', function(event, user) {
  //   $scope.ms.followedUser = $scope.ms.followedUser == user ? undefined : user;
  // });
  //
  // $scope.$on('locationClick', function(event, location) {
  //   $scope.locationClick(location);
  // });
  //
  // $scope.$on('observationClick', function(event, observation) {
  //   $scope.setActiveFeature(observation, {id: observation.layerId});
  // });

  // $scope.exportLayers = [];
  // $scope.baseLayers = [];
  // $scope.featureLayers = [];
  // $scope.imageryLayers = [];
  // $scope.startTime = new Date();
  // $scope.endTime = new Date();

  // $scope.$watch('newObservation.id', function(newObservation) {
  //   if (!newObservation) return;
  //
  //   var featureLayer = _.find($scope.featureLayers, function(layer) {
  //     return layer.id == ppConstants.featureLayer.id;
  //   });
  //
  //   if (!featureLayer.features) return;
  //
  //   featureLayer.features.push($scope.newObservation);
  //
  //   // this has to change.  This is how the leaflet-directive knows to pick up new features, but it is not good
  //   $scope.layer.features = {features: featureLayer.features};
  //
  //   createAllFeaturesArray();
  // });


  // $scope.$on('newObservationSaved', function(event, observation) {
    // $scope.newObservationEnabled = false;
    // isEditing = false;
    //
    // // this will get me a new copy of the array to mod and p***REMOVED*** to leaflet leaflet-directive
    // // as below this is not great and can be reworked if there is one place to look for features
    // var features = ppConstants.featureLayer.features ? ppConstants.featureLayer.features.slice(0) : [];
    // var existingFeature = _.find(features, function(feature) {
    //   return feature.id == observation.id;
    // });
    //
    // if (existingFeature) {
    //   existingFeature = observation;
    // } else {
    //   features.push(observation);
    // }
    //
    // // this has to change.  This is how the leaflet-directive knows to pick up new features, but it is not good
    // if ($scope.layer) {
    //   $scope.layer.features = {features: features};
    // }
  // });

  // $scope.$on('newAttachmentSaved', function(e, attachment, observationId) {
  //   var features = ppConstants.featureLayer.features ? ppConstants.featureLayer.features.slice(0) : [];
  //   var existingFeature = _.find(features, function(feature) {
  //     return feature.id == observationId;
  //   });
  //
  //   if (existingFeature) {
  //     existingFeature.attachments.push(attachment);
  //   }
  // });

  // $scope.$on('observationDeleted', function(event, observation) {
  //   console.info('observation deleted', observation);
  //   // this triggers the leaflet-directive watch.  I don't like this either
  //   $scope.deletedFeature = observation;
  //
  //   // this is the way it should be done.  update leaflet-directive to work this way
  //   var featureLayer = _.find($scope.featureLayers, function(layer) {
  //     return layer.id == observation.layerId;
  //   });
  //   if (featureLayer) {
  //
  //     var existingObservation = _.find(featureLayer.features, function(o) {
  //       return o.id == observation.id;
  //     });
  //
  //     featureLayer.features = _.without(featureLayer.features, existingObservation);
  //     // this has to change.  This is how the leaflet-directive knows to pick up new features, but it is not good
  //     $scope.layer.features = {features: featureLayer.features};
  //   }
  //   createAllFeaturesArray();
  // });

  // $scope.selectedBucket = 0;

  // $scope.setBucket = function(index) {
  //   $scope.selectedBucket = index;
  // }

  // $scope.hideLocations = function() {
  //   createAllFeaturesArray();
  // }

  // $scope.hideClearedFeatures = function(featureLayer) {
  //
  //   var filteredFeatures = [];
  //   if (featureLayer.hideClearedFeatures) {
  //     // we are filtering the features.features array
  //     filteredFeatures = _.filter(featureLayer.features, function(feature){ return !feature.properties.EVENTCLEAR; });
  //     // this has to change.
  //     $scope.layer = {id: featureLayer.id, checked: featureLayer.checked};
  //     $scope.layer.features = {features: filteredFeatures};
  //     $scope.removeFeaturesFromMap = {layerId: featureLayer.id, features: _.difference(featureLayer.features, filteredFeatures)};
  //   } else {
  //     $scope.layer = {id: featureLayer.id, checked: featureLayer.checked};
  //     $scope.layer.features = {features: featureLayer.features};
  //   }
  //   createAllFeaturesArray();
  // }

  // var createAllFeaturesArray = function() {
  //   var allFeatures = $scope.locations && !$scope.hideLocationsFromNewsFeed ? $scope.locations : [];
  //   _.each($scope.featureLayers, function(layer) {
  //     if (layer.checked) {
  //       allFeatures = allFeatures.concat(_.filter(layer.features, function(feature){
  //          return !feature.state || feature.state.name != 'archive';
  //       }));
  //     }
  //   });
  //   $scope.feedItems = allFeatures;
  //   $scope.buckets = TimeBucketService.createBuckets(allFeatures, ppConstants.newsFeedItemLimit(), function(item) {
  //     return item.properties ? moment(item.properties.timestamp).valueOf() : moment(item.locations[0].properties.timestamp).valueOf();
  //   }, 'newsfeed');
  // }
  //
  // $scope.$watch("markerLocation", function(location) {
  //   if (!location) return;
  //
  //   if (ObservationService.newForm) {
  //     EventService.getFormField(ObservationService.newForm, 'geometry'). value = {
  //       x: location.lng,
  //       y: location.lat
  //     };
  //   }
  // }, true);

  // $scope.$watch(FilterService.getTimeInterval, function(interval) {
  //   if ($scope.layer && $scope.layer.checked && $scope.layer.type == 'Feature') {
  //     loadLayer($scope.layer);
  //   };
  //   if ($scope.locationServicesEnabled) {
  //     getUserLocations();
  //   }
  // });

  // var loadLayer = function(layer) {
  //   $scope.loadingLayers[layer.id] = true;
  //
  //   // TODO: clean up Tomnod load, looking for layer 999
  //   if (layer.id == "999") {
  //     var options = {
  //       method: "GET",
  //       url: $scope.externalLayers[0].url,
  //       headers: {
  //         "Accepts": "application/json",
  //         "Content-Type": "application/json"
  //       }
  //     }
  //
  //     options.method = "JSONP",
  //     options.params = {
  //        "callback": "JSON_CALLBACK"
  //     }
  //
  //     $http(options)
  //       .success(function(data, status, headers, config) {
  //         console.log('got points');
  //         $scope.layer.features = data;
  //         $scope.loadingLayers[id] = false;
  //       })
  //       .error(function(data, status, headers, config) {
  //         console.log("Error getting features for layer 'layer.name' : " + status);
  //         $scope.loadingLayers[id] = false;
  //       });
  //   } else {
  //     var options = {layerId: layer.id};
  //     if (layer.type == 'Feature') {
  //       options.states = 'active';
  //     }
  //
  //     var interval = FilterService.formatInterval();
  //     if (interval && layer.type == 'Feature') {
  //       options.startDate = interval.start;
  //       options.endDate = interval.end;
  //     }
  //
  //     var features = Feature.getAll(options,
  //       function(response) {
  //       $scope.loadingLayers[layer.id] = false;
  //
  //       _.each(features.features, function(feature) {
  //         feature.layerId = layer.id;
  //       });
  //       var featureLayer = _.find($scope.featureLayers, function(l) {
  //         return l.id == layer.id;
  //       });
  //       if (!featureLayer) {
  //         featureLayer = _.find($scope.externalLayers, function(l) {
  //           return l.id == layer.id;
  //         });
  //       }
  //       featureLayer.features = features.features;
  //
  //       // check if we want to hide cleared features, if so filter them
  //       // this is done so that if we want to show cleared features (or there would be none,
  //       // as is the case with external features), we don't waste time filtering
  //       if (featureLayer.hideClearedFeatures) {
  //         hideClearedFeatures(featureLayer);
  //       } else {
  //         // this has to change.
  //         $scope.layer.features = features;
  //         createAllFeaturesArray();
  //       }
  //
  //     }, function(response) {
  //       console.info('there was an error, code was ' + response.status);
  //     });
  //   }
  //
  //   $scope.layer = {id: layer.id, type: layer.type, checked: true};
  // };

  // $rootScope.$on('event:auth-loginConfirmed', function() {
  //   _.each($scope.privateBaseLayers, function(layer) {
  //     layer.url = layer.url.replace(/\?access_token=\w+/,"?access_token=" + LocalStorageService.getToken());
  //   });
  //   _.each($scope.privateImageryLayers, function(layer) {
  //     layer.url = layer.url.replace(/\?access_token=\w+/,"?access_token=" + TokenSerice.getToken());
  //   });
  // });



  // $scope.onFeatureLayer = function(layer) {
  //   if (layer.checked) {
  //     loadLayer(layer);
  //   } else {
  //     $scope.layer = {id: layer.id, checked: false};
  //     layer.features = [];
  //     createAllFeaturesArray();
  //   }
  // }

  // var getUserLocations = function() {
  //   var options = {};
  //   var interval = FilterService.formatInterval();
  //   if (interval) {
  //     options.startDate = interval.start;
  //     options.endDate = interval.end;
  //   }
  //
  //   ds.locationsLoaded = false;
  //   Location.get(options).$promise.then(function(data) {
  //     ds.locationsLoaded = true;
  //     $scope.locations = data;
  //     createAllFeaturesArray();
  //     _.each($scope.locations, function(userLocation) {
  //       if ($scope.ms.followedUser == userLocation.user) {
  //         if(!$scope.ms.lastFollowedLocation ||
  //             $scope.ms.lastFollowedLocation.locations[0].properties.timestamp != userLocation.locations[0].properties.timestamp) {
  //           $scope.ms.lastFollowedLocation = userLocation;
  //           $scope.locationClick(userLocation);
  //         }
  //       }
  //     });
  //
  //     ds.locations = data;
  //   });
  // }

  // var pollTheData = function() {
  //   if ($scope.pollTime == 0) {
  //     TimerService.stop('pollingData');
  //   } else {
  //     TimerService.start('pollingData', $scope.pollTime, function() {
  //       _.each($scope.featureLayers, function(layer) {
  //         if (layer.checked) {
  //           loadLayer(layer);
  //         }
  //       });
  //       if ($scope.locationServicesEnabled) {
  //         getUserLocations();
  //       }
  //     });
  //   }
  // }

  // $scope.$watch('pollTime', pollTheData);

  // $scope.onImageryLayer = function(layer) {
  //   if (layer.checked) {
  //     $scope.layer = layer;
  //   } else {
  //     $scope.layer = {id: layer.id, checked: false};
  //   }
  // }

  // /* Settings aka layer panel funcitons */
  // $scope.openSettings = function () {
  //   $scope.showSettings = true;
  // }
  //
  // $scope.closeSettings = function () {
  //   $scope.showSettings = false;
  // }
  //
  // $scope.toggleLocate = function() {
  //   $scope.locate = !$scope.locate;
  //
  //   // if I am turning off locate and broadcast is
  //   // on, then turn off broadcast too.
  //   if (!$scope.locate && $scope.broadcast) {
  //     $scope.toggleBroadcast();
  //   }
  // }

  // $scope.toggleBroadcast = function() {
  //   var timerName = 'broadcastLocation';
  //   $scope.broadcast = !$scope.broadcast;
  //
  //   if ($scope.broadcast) {
  //     $scope.locate = true;
  //
  //     TimerService.start(timerName, 5000, function() {
  //       if (!$scope.location) return;
  //
  //       $scope.positionBroadcast = CreateLocation.create({
  //         geometry: {
  //           type: 'Point',
  //           coordinates: [$scope.location.longitude, $scope.location.latitude]
  //         },
  //         properties: {
  //           timestamp: $scope.location.timestamp ? $scope.location.timestamp : new Date().valueOf(),
  //           accuracy: $scope.location.accuracy,
  //           altitude: $scope.location.altitude,
  //           altitudeAccuracy: $scope.location.altitudeAccuracy,
  //           heading: $scope.location.heading,
  //           speed: $scope.location.speed
  //         }
  //       });
  //     });
  //   } else {
  //     TimerService.stop(timerName);
  //   }
  // }

  // $scope.newsFeed = function() {
  //     $scope.setCurrentSidePanel('newsFeed');
  // }

  // $scope.locationServices = function() {
  //   var timerName = 'pollLocation';
  //
  //   if ($scope.locationServicesEnabled) {
  //     getUserLocations();
  //   } else {
  //     $scope.locations = ds.locations = [];
  //     createAllFeaturesArray();
  //   }
  // }

  // $scope.$watch('locationPollTime', function() {
  //   if ($scope.locationPollTime) {
  //     $scope.locationServices();
  //   }
  // });

  // $scope.newsFeedOrder = function(feedItem, a, b, c) {
  //   var time = feedItem.properties ? moment(feedItem.properties.timestamp) : moment(feedItem.locations[0].properties.timestamp);
  //
  //   time = time || Date.now();
  //   return time.valueOf();
  // }

  // $scope.dismissLocations = function() {
  //   console.log("in dismissLocations");
  //   $scope.showLocations = false;
  // }
