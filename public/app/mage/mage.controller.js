var _ = require('underscore')
  , angular = require('angular');

module.exports = MageController;

MageController.$inject = [
  '$scope',
  '$compile',
  '$timeout',
  '$animate',
  '$document',
  '$uibModal',
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

function MageController($scope, $compile, $timeout, $animate, $document, $uibModal, UserService, FilterService, EventService, MapService, LocalStorageService, Observation, Location, LocationService, FeatureService) {
  $scope.hideFeed = false;

  var observationsById = {};
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

  $animate.on('addClass', $document.find('.feed'), resolveMapAfterFeaturesPaneTransition);
  $animate.on('removeClass', $document.find('.feed'), resolveMapAfterFeaturesPaneTransition);

  function resolveMapAfterFeaturesPaneTransition($mapPane, animationPhase) {
    if (animationPhase === 'close') {
      MapService.hideFeed($scope.hideFeed);
    }
  }

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
    featureIdToLayer: {},
    options: {
      selected: true,
      cluster: true,
      style: function() {
        return {};
      },
      onEachFeature: function(feature, layer) {
        observationLayer.featureIdToLayer[feature.id] = layer
      },
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
          };

          newScope.onZoom = function(observation) {
            MapService.zoomToFeatureInLayer(observation, 'Observations');
          };

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
  };
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
          var user = location.user;
          var el = angular.element('<div location-popup="user" user-popup-info="onInfo(user)" user-zoom="onZoom(user)"></div>');
          var compiled = $compile(el);
          var newScope = $scope.$new(true);
          newScope.user = user;
          newScope.onInfo = function(user) {
            $timeout(function() {
              onUserSelected(user, {scrollTo: true});
            });
          };

          newScope.onZoom = function(user) {
            MapService.zoomToFeatureInLayer(user, 'People');
          };

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
  };
  MapService.createVectorLayer(peopleLayer);

  var layersChangedListener = {
    onLayersChanged: onLayersChanged
  };
  EventService.addLayersChangedListener(layersChangedListener);

  var filterChangedListener = {
    onFilterChanged: onFilterChanged
  };
  FilterService.addListener(filterChangedListener);

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
      if (layer.type === 'Imagery' && layer.url.indexOf('private') === 0) {
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
                  // TODO use leaflet template for this
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
      } else if (layer.type === 'GeoPackage') {
        layer.eventId = $scope.filteredEvent.id;
        MapService.createRasterLayer(layer);
      }
    });

    _.each(changed.removed, function(layer) {
      MapService.removeLayer(layer);
    });
  }

  function onLocation(l) {
    var event = FilterService.getEvent();
    Location.create({
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
      $uibModal.open({
        template: require('../error/not.in.event.html'),
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
    $scope.$broadcast('observation:view', observation, options);
  }

  function onObservationDeselected(observation) {
    $scope.$broadcast('observation:deselect', observation);
  }

  function onUserSelected(user, options) {
    $scope.$broadcast('user:select', user);
    if (options.scrollTo) {
      $scope.hideFeed = false;
      MapService.hideFeed(false);
    }
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

  $scope.$on('feed:toggle', function() {
    $scope.hideFeed = !$scope.hideFeed;
    $scope.$apply();
  });

}
