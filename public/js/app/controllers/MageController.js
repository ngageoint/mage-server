angular
  .module('mage')
  .controller('MageController', MageController);

MageController.$inject = [
  '$scope',
  '$compile',
  '$timeout',
  'FilterService',
  'EventService',
  'MapService',
  'PollingService',
  'LocalStorageService',
  'Layer',
  'Observation',
  'Location',
  'LocationService',
  'FeatureService'
];

function MageController($scope, $compile, $timeout, FilterService, EventService, MapService, PollingService, LocalStorageService, Layer, Observation, Location, LocationService, FeatureService) {

  var observationsById = {};
  var newObservation = null;
  var selectedObservationId = null;
  $scope.feedObservations = [];
  $scope.feedChangedObservations = {count: 0};

  var usersById = {};
  var selectedUserId = null;
  var followingUserId = null;
  $scope.feedUsers = [];
  $scope.feedChangedUsers = {};

  // TODO is there a better way to do this?
  // Need to hang onto popup scopes so that I can delete the scope if the observation
  // get deleted.  I.E. no observation, no popup so remove its scope
  // Possible user of leaflet templates to accomplish this in leaflet
  // rather than angular
  var popupScopes = {};

  var observationLayer = {
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
  }
  MapService.createVectorLayer(observationLayer);

  var peopleLayer = {
    name: 'People',
    group: 'MAGE',
    type: 'geojson',
    options: {
      selected: true,
      cluster: false,
      temporal: {
        property: 'timestamp',
        colorBuckets: LocationService.colorBuckets
      },
      popup: {
        html: function(location) {
          var user = usersById[location.id];
          var el = angular.element('<div location-popup="user" user-popup-info="onInfo(user)"></div>');
          var compiled = $compile(el);
          var newScope = $scope.$new(true);
          newScope.user = user;
          newScope.onInfo = function(user) {
            $timeout(function() {
              onUserSelected(user);
            });
          }
          compiled(newScope);
          popupScopes[user.id] = newScope;

          return el[0];
        },
        closeButton: false,
        onClose: function(user) {
          $timeout(function() {
            onUserDeselected(user);
          });
        }
      }
    }
  }
  MapService.createVectorLayer(peopleLayer);

  var observationsChangedListener = {
    onObservationsChanged: onObservationsChanged
  };
  EventService.addObservationsChangedListener(observationsChangedListener);

  var filterChangedListener = {
    onEventChanged: function(changed) {
      _.each(changed.removed, function(removed) {
        $scope.feedChangedObservations = {count: 0};
        $scope.feedChangedUsers = {};
      });
    }
  };
  FilterService.addListener(filterChangedListener);

  var usersChangedListener = {
    onUsersChanged: onUsersChanged
  };
  EventService.addUsersChangedListener(usersChangedListener);

  var locationListener = {
    onLocation: onLocation
  };
  MapService.addListener(locationListener);

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

        MapService.createRasterLayer(layer);
      } else if (layer.type === 'Feature') {
        FeatureService.getFeatureCollection(layer).then(function(featureCollection) {
          MapService.createVectorLayer({
            name: layer.name, // TODO need to track by id as well not just names
            group: 'Static',
            type: 'geojson',
            geojson: featureCollection,
            options: {
              popup: {
                html: function(feature) {
                  // TODO user leaflet template for this
                  var content = "";
                  if (feature.properties.name) {
                    content += '<div><strong><u>' + feature.properties.name + '</u></strong></div>';
                  }
                  if (feature.properties.description) {
                    content += '<div>' + feature.properties.description + '</div>';
                  }

                  return content;
                }
              }
            }
          });
        });
      }
    });
  });

  function onObservationsChanged(changed) {
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;
    });
    if (changed.added) MapService.addFeaturesToLayer(changed.added, 'Observations');

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
    $scope.feedObservations = _.values(observationsById);

    if (changed.added) $scope.feedChangedObservations.count += changed.added.length;
    if (changed.updated) $scope.feedChangedObservations.count += changed.updated.length;
  }

  function onUsersChanged(changed) {
    _.each(changed.added, function(added) {
      usersById[added.id] = added;

      MapService.addFeaturesToLayer([added.location], 'People');

      $scope.feedChangedUsers[added.id] = true;
    });

    _.each(changed.updated, function(updated) {
      var user = usersById[updated.id];
      if (user) {
        user = updated;

        MapService.updateFeatureForLayer(user.location, 'People');

        // pan/zoom map to user if this is the user we are following
        if (user.id === followingUserId) MapService.selectFeatureInLayer(user, 'People', {panToLocation: true, zoomToLocation: true});
      }

      $scope.feedChangedUsers[updated.id] = true;
    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];

      MapService.removeFeatureFromLayer(removed.location, 'People');

      var scope = popupScopes[removed.id];
      if (scope) {
        scope.$destroy();
        delete popupScopes[removed.id];
      }
    });

    // update the news feed observations
    $scope.feedUsers = _.values(usersById);
  }

  function onLocation(l) {
    var event = FilterService.getEvent();
    var location = Location.create({
      eventId: event.id,
      geometry: {
        type: 'Point',
        coordinates: [l.longitude, l.latitude]
      },
      properties: {
        timestamp: new Date().valueOf(),
        accuracy: l.accuracy,
        altitude: l.altitude,
        altitudeAccuracy: l.altitudeAccuracy,
        heading: l.heading,
        speed: l.speed
      }
    });
  }

  function onObservationSelected(observation, options) {
    // Prevent selected event for already selected observation
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

  function onUserSelected(user, options) {
    // Prevent selected event for already selected user
    if (selectedUserId !== user.id) {
      selectedUserId = user.id;
      $scope.$broadcast('user:select', user);
      MapService.selectFeatureInLayer(user, 'People', options);
    }
  }

  function onUserDeselected(user) {
    selectedUserId = null;
    $scope.$broadcast('user:deselect', user);
  }

  $scope.$on('$destroy', function() {
    FilterService.removeListener(filterChangedListener);
    EventService.removeObservationsChangedListener(observationsChangedListener);
    EventService.removeUsersChangedListener(usersChangedListener);
    MapService.removeListener(locationListener);
    MapService.destroy();
    PollingService.setPollingInterval(0); // stop polling
  });

  $scope.$on('observation:selected', function(e, observation, options) {
    onObservationSelected(observation, options);
  });

  $scope.$on('user:selected', function(e, user, options) {
    onUserSelected(user, options);
  });

  $scope.$on('user:follow', function(e, user) {
    if (user) {
      followingUserId = user.id;
      onUserSelected(user, {panToLocation: true, zoomToLocation: true});
    } else {
      followingUserId = null;
    }
  });

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
