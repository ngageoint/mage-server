angular
  .module('mage')
  .controller('MageController', MageController);

MageController.$inject = [
  '$scope',
  '$compile',
  '$timeout',
  '$modal',
  'UserService',
  'FilterService',
  'EventService',
  'MapService',
  'LocalStorageService',
  'Observation',
  'Location',
  'LocationService',
  'FeatureService'
];

function MageController($scope, $compile, $timeout, $modal, UserService, FilterService, EventService, MapService, LocalStorageService, Observation, Location, LocationService, FeatureService) {

  var observationsById = {};
  var newObservation = null;
  var firstObservationChange = true;
  $scope.feedObservations = [];
  $scope.feedChangedObservations = {count: 0};

  var usersById = {};
  var followingUserId = null;
  var firstUserChange = true;
  $scope.feedUsers = [];
  $scope.feedChangedUsers = {};

  $scope.filteredEvent = FilterService.getEvent();
  $scope.filteredInterval = FilterService.getIntervalChoice().label;

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
          var el = angular.element('<div observation-popup="observation" observation-popup-info="onInfo(observation)" observation-zoom="onZoom(observation)"></div>');
          var compiled = $compile(el);
          var newScope = $scope.$new(true);
          newScope.observation = observation;
          newScope.onInfo = function(observation) {
            $timeout(function() {
              onObservationSelected(observation, {scrollTo: true});
            });
          }
          newScope.onZoom = function(observation) {
            MapService.zoomToFeatureInLayer(observation, 'Observations');
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
      showAccuracy: true,
      temporal: {
        property: 'timestamp',
        colorBuckets: LocationService.colorBuckets
      },
      popup: {
        html: function(location) {
          var user = usersById[location.id];
          var el = angular.element('<div location-popup="user" user-popup-info="onInfo(user)" user-zoom="onZoom(user)"></div>');
          var compiled = $compile(el);
          var newScope = $scope.$new(true);
          newScope.user = user;
          newScope.onInfo = function(user) {
            $timeout(function() {
              onUserSelected(user, {scrollTo: true});
            });
          }
          newScope.onZoom = function(user) {
            MapService.zoomToFeatureInLayer(user, 'People');
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

  var layersChangedListener = {
    onLayersChanged: onLayersChanged
  }
  EventService.addLayersChangedListener(layersChangedListener);

  var filterChangedListener = {
    onFilterChanged: onFilterChanged
  };
  FilterService.addListener(filterChangedListener);

  var usersChangedListener = {
    onUsersChanged: onUsersChanged
  };
  EventService.addUsersChangedListener(usersChangedListener);

  var pollListener = {
    onPoll: onPoll
  };
  EventService.addPollListener(pollListener);

  var locationListener = {
    onLocation: onLocation,
    onBroadcastLocation: onBroadcastLocation
  };
  MapService.addListener(locationListener);

  function onFilterChanged(filter) {
    $scope.feedChangedObservations = {count: 0};
    $scope.feedChangedUsers = {};

    firstUserChange = true;
    firstObservationChange = true;

    if (filter.event) {
      $scope.filteredEvent = FilterService.getEvent();

      // Close the new observation panel if its open
      // If it was open it was open for a different event
      $scope.$broadcast('observation:cancel');

      // Stop broadcasting location if the event switches
      MapService.onLocationStop();
    }

    if (filter.teams) $scope.filteredTeams = _.map(FilterService.getTeams(), function(t) { return t.name; }).join(', ');
    if (filter.timeInterval) {
      var intervalChoice = FilterService.getIntervalChoice();
      if (intervalChoice.filter !== 'all') {
        if (intervalChoice.filter === 'custom') {
          // TODO format custom time interval
          $scope.filteredInterval = 'Custom time interval';
        } else {
          $scope.filteredInterval = intervalChoice.label;
        }
      } else {
        $scope.filteredInterval = null;
      }
    }
  }

  function onLayersChanged(changed, event) {
    var baseLayerFound = false;
    _.each(changed.added, function(layer) {
      // Add token to the url of all private layers
      // TODO add watch for token change and reset the url for these layers
      if (layer.type === 'Imagery' && layer.url.indexOf('private') == 0) {
        layer.url = layer.url + "?access_token=" + LocalStorageService.getToken();
      }

      if (layer.type === 'Imagery') {
        if (layer.base && !baseLayerFound) {
          layer.options = {selected: true};
          baseLayerFound = true;
        }

        MapService.createRasterLayer(layer);
      } else if (layer.type === 'Feature') {
        FeatureService.getFeatureCollection(event, layer).then(function(featureCollection) {
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

    _.each(changed.removed, function(layer) {
      MapService.removeLayer(layer);
    });
  }

  function onObservationsChanged(changed) {
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;
    });
    if (changed.added.length) MapService.addFeaturesToLayer(changed.added, 'Observations');

    _.each(changed.updated, function(updated) {
      var observation = observationsById[updated.id];
      if (observation) {
        observationsById[updated.id] = updated;
        popupScopes[updated.id].user = updated;
        MapService.updateFeatureForLayer(updated, 'Observations');
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

    if (!firstObservationChange) {
      if (changed.added) $scope.feedChangedObservations.count += changed.added.length;
      if (changed.updated) $scope.feedChangedObservations.count += changed.updated.length;
    }

    firstObservationChange = false;
  }

  function onUsersChanged(changed) {
    _.each(changed.added, function(added) {
      usersById[added.id] = added;

      MapService.addFeaturesToLayer([added.location], 'People');

      if (!firstUserChange) $scope.feedChangedUsers[added.id] = true;
    });

    _.each(changed.updated, function(updated) {
      var user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;
        popupScopes[updated.id].user = updated;
        MapService.updateFeatureForLayer(updated.location, 'People');

        // pan/zoom map to user if this is the user we are following
        if (user.id === followingUserId) MapService.zoomToFeatureInLayer(user, 'People');
      }

      if (!firstUserChange) $scope.feedChangedUsers[updated.id] = true;
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

    firstUserChange = false;
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

  function onBroadcastLocation(callback) {
    if (!EventService.isUserInEvent(UserService.myself, FilterService.getEvent())) {
      $modal.open({
        templateUrl: '/app/error/not.in.event.html',
        controller: 'NotInEventController',
        resolve: {
          title: function() {
            return 'Cannot Broadcast Location';
          }
        }
      });

      callback(false);
    } else {
      callback(true);
    }
  }

  function onPoll() {
    // The event service just polled, lets update times and marker colors
    $scope.$broadcast('observation:poll');
    $scope.$broadcast('user:poll');
    MapService.onPoll();
  }

  function onObservationSelected(observation, options) {
    $scope.$broadcast('observation:select', observation, options);
  }

  function onObservationDeselected(observation) {
    $scope.$broadcast('observation:deselect', observation);
  }

  function onUserSelected(user, options) {
    $scope.$broadcast('user:select', user);
  }

  function onUserDeselected(user) {
    $scope.$broadcast('user:deselect', user);
  }

  $scope.$on('$destroy', function() {
    FilterService.removeListener(filterChangedListener);
    EventService.removeLayersChangedListener(layersChangedListener);
    EventService.removeObservationsChangedListener(observationsChangedListener);
    EventService.removeUsersChangedListener(usersChangedListener);
    EventService.removePollListener(pollListener);
    MapService.destroy();
  });

  $scope.$on('observation:selected', function(e, observation, options) {
    onObservationSelected(observation, options);
  });

  $scope.$on('observation:zoom', function(e, observation) {
    MapService.zoomToFeatureInLayer(observation, 'Observations');
  });

  $scope.$on('user:zoom', function(e, user, options) {
    MapService.zoomToFeatureInLayer(user, 'People');
  });

  $scope.$on('user:follow', function(e, user) {
    if (user && user.id !== followingUserId) {
      followingUserId = user.id;
      MapService.zoomToFeatureInLayer(user, 'People');
    } else {
      followingUserId = null;
    }
  });

  $scope.$on('observation:create', function(e, latlng) {
    var event = FilterService.getEvent();

    if (!EventService.isUserInEvent(UserService.myself, event)) {
      $modal.open({
        templateUrl: '/app/error/not.in.event.html',
        controller: 'NotInEventController',
        resolve: {
          title: function() {
            return 'Cannot Create Observation';
          }
        }
      });

      return;
    }

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
