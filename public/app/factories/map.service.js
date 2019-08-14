var _ = require('underscore');

module.exports = MapService;

MapService.$inject = ['EventService', 'LocationService', 'FeatureService', '$compile', '$rootScope'];

function MapService(EventService, LocationService, FeatureService, $compile, $rootScope) {

  var followedFeature = {
    id: undefined,
    layer: undefined
  };

  var service = {
    addListener: addListener,
    removeListener: removeListener,
    getRasterLayers: getRasterLayers,
    selectBaseLayer: selectBaseLayer,
    overlayAdded: overlayAdded,
    removeLayer: removeLayer,
    destroy: destroy,
    getVectorLayers: getVectorLayers,
    createRasterLayer: createRasterLayer,
    createVectorLayer: createVectorLayer,
    createMarker: createMarker,
    removeMarker: removeMarker,
    updateMarker: updateMarker,
    updateShapeType: updateShapeType,
    edit: edit,
    create: create,
    updateIcon: updateIcon,
    addFeaturesToLayer: addFeaturesToLayer,
    updateFeatureForLayer: updateFeatureForLayer,
    removeFeatureFromLayer: removeFeatureFromLayer,
    zoomToFeatureInLayer: zoomToFeatureInLayer,
    followFeatureInLayer: followFeatureInLayer,
    onLocation: onLocation,
    onLocationStop: onLocationStop,
    onBroadcastLocation: onBroadcastLocation,
    onPoll: onPoll,
    hideFeed: hideFeed,
    followedFeature: followedFeature
  };

  var baseLayer = null;
  var rasterLayers = {};
  var vectorLayers = {};
  var listeners = [];
  var observationsById = {};
  var usersById = {};
  var popupScopes = {};

  initialize();

  return service;

  function initialize() {

    var observationsChangedListener = {
      onObservationsChanged: onObservationsChanged
    };
    EventService.addObservationsChangedListener(observationsChangedListener);
  
    var usersChangedListener = {
      onUsersChanged: onUsersChanged
    };
    EventService.addUsersChangedListener(usersChangedListener);

    var layersChangedListener = {
      onLayersChanged: onLayersChanged
    };
    EventService.addLayersChangedListener(layersChangedListener);

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
              $rootScope.$broadcast('observation:view', observation)
            };
  
            newScope.onZoom = function(observation) {
              service.zoomToFeatureInLayer(observation, 'Observations');
            };
  
            compiled(newScope);
            popupScopes[observation.id] = newScope;
  
            return el[0];
          },
          closeButton: false,
          onClose: function(observation) {
            $scope.$broadcast('observation:deselect', observation);
          }
        }
      }
    };
    service.createVectorLayer(observationLayer);

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
            var user = usersById[location.userId];
            var el = angular.element('<div location-popup="user" user-popup-info="onInfo(user)" user-zoom="onZoom(user)"></div>');
            var compiled = $compile(el);
            var newScope = $scope.$new(true);
            newScope.user = user;
            newScope.onInfo = function(user) {
              $rootScope.$broadcast('user:select', user);
            };
  
            newScope.onZoom = function(user) {
              service.zoomToFeatureInLayer(user, 'People');
            };
  
            compiled(newScope);
            popupScopes[user.id] = newScope;
  
            return el[0];
          },
          closeButton: false,
          onClose: function(user) {
            $rootScope.$broadcast('user:deselect', user);
          }
        }
      }
    };
    service.createVectorLayer(peopleLayer);
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

        service.createRasterLayer(layer);
      } else if (layer.type === 'Feature') {
        FeatureService.getFeatureCollection(event, layer).then(function(featureCollection) {
          service.createVectorLayer({
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
        service.createRasterLayer(layer);
      }
    });

    _.each(changed.removed, function(layer) {
      service.removeLayer(layer);
    });
  }

  function onObservationsChanged(changed) {
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;
    });
    if (changed.added.length) service.addFeaturesToLayer(changed.added, 'Observations');

    _.each(changed.updated, function(updated) {
      var observation = observationsById[updated.id];
      if (observation) {
        observationsById[updated.id] = updated;
        popupScopes[updated.id].user = updated;
        service.updateFeatureForLayer(updated, 'Observations');
      }
    });

    _.each(changed.removed, function(removed) {
      delete observationsById[removed.id];

      service.removeFeatureFromLayer(removed, 'Observations');

      var scope = popupScopes[removed.id];
      if (scope) {
        scope.$destroy();
        delete popupScopes[removed.id];
      }
    });
  }

  function onUsersChanged(changed) {
    _.each(changed.added, function(added) {
      usersById[added.id] = added;
      service.addFeaturesToLayer([added.location], 'People');
    });

    _.each(changed.updated, function(updated) {
      var user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;
        popupScopes[updated.id].user = updated;
        service.updateFeatureForLayer(updated.location, 'People');

        // pan/zoom map to user if this is the user we are following
        if (followFeatureInLayer.layer === 'People' && user.id === followFeatureInLayer.id)
          service.zoomToFeatureInLayer(user, 'People');
      }

    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];
      service.removeFeatureFromLayer(removed.location, 'People');

      var scope = popupScopes[removed.id];
      if (scope) {
        scope.$destroy();
        delete popupScopes[removed.id];
      }
    });
  }

  function addListener(listener) {
    listeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      var layers = _.values(rasterLayers).concat(_.values(vectorLayers));
      listener.onLayersChanged({added: layers});
    }

    if (_.isFunction(listener.onFeaturesChanged)) {
      _.each(_.values(vectorLayers), function(vectorLayer) {
        listener.onFeaturesChanged({name: vectorLayer.name, added: _.values(vectorLayer.featuresById)});
      });
    }

    if (_.isFunction(listener.onBaseLayerSelected) && baseLayer) {
      listener.onBaseLayerSelected(baseLayer);
    }
  }

  function removeListener(listener) {
    listeners = _.reject(listeners, function(l) { return l === listener; });
  }

  function getRasterLayers() {
    return rasterLayers;
  }

  function getVectorLayers() {
    return vectorLayers;
  }

  function createRasterLayer(layer) {
    layersChanged({
      added: [layer]
    });

    rasterLayers[layer.name] = layer;
  }

  function createVectorLayer(layer) {
    layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    vectorLayers[layer.name] = layer;
  }

  function createMarker(marker, options) {
    if (options) marker.options = options;

    layersChanged({
      name: marker.id,
      added: [marker]
    });
  }

  function removeMarker(marker, markerId) {
    layersChanged({
      name: markerId,
      removed: [marker]
    });
  }

  function updateMarker(marker, markerId) {
    layersChanged({
      name: markerId,
      updated: [marker]
    });
  }

  function create(create) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onCreate)) {
        listener.onCreate(create);
      }
    });
  }

  function edit(edit) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onEdit)) {
        listener.onEdit(edit);
      }
    });
  }

  function updateIcon(marker, iconUrl) {
    layersChanged({
      id: marker.id,
      updateIcon: [{id:marker.id, marker: marker, iconUrl:iconUrl}]
    });
  }

  function updateShapeType(marker) {
    layersChanged({
      id: marker.id,
      updateShapeType: [{id: marker.id, marker: marker}]
    });
  }

  function addFeaturesToLayer(features, layerId) {
    var vectorLayer = vectorLayers[layerId];
    _.each(features, function(feature) {
      vectorLayer.featuresById[feature.id] = feature;
    });

    featuresChanged({
      name: layerId,
      added: [features]
    });
  }

  function updateFeatureForLayer(feature, layerId) {
    featuresChanged({
      name: layerId,
      updated: [feature]
    });
  }

  function removeFeatureFromLayer(feature, layerId) {
    var vectorLayer = vectorLayers[layerId];
    delete vectorLayer.featuresById[feature.id];

    featuresChanged({
      name: layerId,
      removed: [feature]
    });
  }

  function zoomToFeatureInLayer(feature, layerId) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFeatureZoom)) {
        listener.onFeatureZoom({
          name: layerId,
          feature: feature
        });
      }
    });
  }

  function followFeatureInLayer(feature, layerId) {
    if (feature && (followedFeature.id !== feature.id || followedFeature.layer !== layerId)) {
      followedFeature.id = feature.id;
      followedFeature.layer = layerId;
      service.zoomToFeatureInLayer(feature, layerId);
    } else {
      followedFeature.id = undefined;
      followedFeature.layer = undefined;
    }
  }

  function onLocation(location) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onLocation)) {
        listener.onLocation(location);
      }
    });
  }

  function onLocationStop() {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onLocationStop)) {
        listener.onLocationStop();
      }
    });
  }

  function onBroadcastLocation(callback) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onBroadcastLocation)) {
        listener.onBroadcastLocation(callback);
      }
    });
  }

  function onPoll() {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onPoll)) {
        listener.onPoll();
      }
    });
  }

  function featuresChanged(changed) {
    _.each(listeners, function(listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onFeaturesChanged)) {
        listener.onFeaturesChanged(changed);
      }
    });
  }

  function layersChanged(changed) {
    _.each(listeners, function(listener) {
      changed.added = changed.added || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed);
      }
    });
  }

  function selectBaseLayer(layer) {
    baseLayer = layer;
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onBaseLayerSelected)) {
        listener.onBaseLayerSelected(layer);
      }
    });
  }

  function overlayAdded(overlay) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onOverlayAdded)) {
        listener.onOverlayAdded(overlay);
      }
    });
  }

  function destroy() {
    _.each(_.values(vectorLayers), function(layerInfo) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    vectorLayers = {};

    _.each(_.values(rasterLayers), function(layerInfo) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    rasterLayers = {};

    listeners = [];

    EventService.removeLayersChangedListener(layersChangedListener);
    EventService.removeObservationsChangedListener(observationsChangedListener);
    EventService.removeUsersChangedListener(usersChangedListener);
  }

  function removeLayer(layer) {
    var vectorLayer = vectorLayers[layer.name];
    if (vectorLayer) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(vectorLayer);
        }
      });

      delete vectorLayers[layer.name];
    }

    var rasterLayer = rasterLayers[layer.name];
    if (rasterLayer) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(rasterLayer);
        }
      });

      delete rasterLayers[layer.name];
    }
  }

  function hideFeed(hide) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onHideFeed)) {
        listener.onHideFeed(hide);
      }
    });
  }
}
