const _ = require('underscore');

module.exports = MapService;

MapService.$inject = ['EventService', 'LocationService', 'FeatureService', 'LocalStorageService', 'MapPopupService'];

function MapService(EventService, LocationService, FeatureService, LocalStorageService, MapPopupService) {

  // Map Service should delegate to some map provider that implements delegate interface
  // In this case should delegate to leaflet directive.  See if this is possible

  var followedFeature = {
    id: undefined,
    layer: undefined
  };

  var service = {
    setDelegate: setDelegate,
    addListener: addListener,
    removeListener: removeListener,
    getRasterLayers: getRasterLayers,
    selectBaseLayer: selectBaseLayer,
    overlayAdded: overlayAdded,
    removeLayer: removeLayer,
    destroy: destroy,
    initialize: initialize,
    getVectorLayers: getVectorLayers,
    createRasterLayer: createRasterLayer,
    createVectorLayer: createVectorLayer,
    createFeature: createFeature,
    addFeaturesToLayer: addFeaturesToLayer,
    updateFeatureForLayer: updateFeatureForLayer,
    removeFeatureFromLayer: removeFeatureFromLayer,
    zoomToFeatureInLayer: zoomToFeatureInLayer,
    deselectFeatureInLayer: deselectFeatureInLayer,
    followFeatureInLayer: followFeatureInLayer,
    onLocation: onLocation,
    onLocationStop: onLocationStop,
    onBroadcastLocation: onBroadcastLocation,
    hideFeed: hideFeed,
    followedFeature: followedFeature
  };

  var delegate = null;
  var baseLayer = null;
  var rasterLayers = {};
  var vectorLayers = {};
  var listeners = [];
  var observationsById = {};
  var usersById = {};

  var layersChangedListener = {
    onLayersChanged: onLayersChanged
  };
  var usersChangedListener = {
    onUsersChanged: onUsersChanged
  };
  var observationsChangedListener = {
    onObservationsChanged: onObservationsChanged
  };

  // initialize();

  return service;

  function initialize() {

    EventService.addObservationsChangedListener(observationsChangedListener);
    EventService.addUsersChangedListener(usersChangedListener);
    EventService.addLayersChangedListener(layersChangedListener);

    const observationLayer = {
      id: 'observations',
      name: 'Observations',
      group: 'MAGE',
      type: 'geojson',
      featureIdToLayer: {},
      options: {
        selected: true,
        cluster: true,
        showAccuracy: true,
        style: function() {
          return {};
        },
        onEachFeature: function(feature, layer) {
          observationLayer.featureIdToLayer[feature.id] = layer;
        },
        popup: (layer, feature) => {
          MapPopupService.popupObservation(layer, feature);
        },
        onLayer: (layer, feature) => {
          MapPopupService.registerObservation(layer, feature);
        }
      }
    };
    service.createVectorLayer(observationLayer);

    const peopleLayer = {
      id: 'people',
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
        popup: (layer, feature) => {
          MapPopupService.popupUser(layer, feature);
        },
        onLayer: (layer, feature) => {
          MapPopupService.registerUser(layer, usersById[feature.id]);
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
            id: layer.id,
            name: layer.name, // TODO need to track by id as well not just names
            group: 'feature',
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
        layer.eventId = event.id;
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
      const observation = observationsById[updated.id];
      if (observation) {
        observationsById[updated.id] = updated;
        service.updateFeatureForLayer(updated, 'Observations');
      }
    });

    _.each(changed.removed, function(removed) {
      delete observationsById[removed.id];

      service.removeFeatureFromLayer(removed, 'Observations');
    });
  }

  function onUsersChanged(changed) {
    _.each(changed.added, function(added) {
      usersById[added.id] = added;
      service.addFeaturesToLayer([added.location], 'People');
    });

    _.each(changed.updated, function(updated) {
      const user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;
        service.updateFeatureForLayer(updated.location, 'People');

        // pan/zoom map to user if this is the user we are following
        if (followFeatureInLayer.layer === 'People' && user.id === followFeatureInLayer.id)
          service.zoomToFeatureInLayer(user, 'People');
      }

    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];
      service.removeFeatureFromLayer(removed.location, 'People');
    });
  }
    
  function setDelegate(theDelegate) {
    delegate = theDelegate;
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

  function createFeature(feature, style, listeners) {
    if (delegate) return delegate.createFeature(feature, style, listeners);
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

  function deselectFeatureInLayer(feature, layerId) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFeatureDeselect)) {
        listener.onFeatureDeselect({
          name: layerId,
          feature: feature
        });
      }
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
