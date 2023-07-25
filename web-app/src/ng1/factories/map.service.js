const _ = require('underscore');

module.exports = MapService;

MapService.$inject = ['EventService', 'LocationService', 'FeatureService', 'LocalStorageService', 'MapPopupService'];

function MapService(EventService, LocationService, FeatureService, LocalStorageService, MapPopupService) {

  // Map Service should delegate to some map provider that implements delegate interface
  // In this case should delegate to leaflet directive.  See if this is possible

  const followedFeature = {
    id: undefined,
    layer: undefined
  };

   const service = {
    setDelegate: setDelegate,
    addListener: addListener,
    removeListener: removeListener,
    getRasterLayers: getRasterLayers,
    selectBaseLayer: selectBaseLayer,
    overlayAdded: overlayAdded,
    removeLayer: removeLayer,
    removeFeed: removeFeed,
    destroy: destroy,
    initialize: initialize,
    getVectorLayers: getVectorLayers,
    createRasterLayer: createRasterLayer,
    createVectorLayer: createVectorLayer,
    createFeedLayer: createFeedLayer,
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
  var feedLayers = {};
  var rasterLayers = {};
  var vectorLayers = {};
  var listeners = [];
  var observationsById = {};
  var usersById = {};

  var layersChangedListener = {
    onLayersChanged: onLayersChanged
  };
  var feedItemsChangedListenner = {
    onFeedItemsChanged: onFeedItemsChanged
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
    EventService.addFeedItemsChangedListener(feedItemsChangedListenner)

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
    let baseLayerFound = false;
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
                  let content = "";
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

  function onFeedItemsChanged(changed) {

    // Filter out non geospatial feeds
    const geospatialFilter = ({feed}) => { return feed.itemsHaveSpatialDimension; }
    changed.added.filter(geospatialFilter).forEach(({ feed, items }) => {
      /*
      TODO: this icon stuff is a band-aid (R) hack. revisit later when this
      transitions to angular x and static icon api gets better.  consider using
      blob urls for marker icons as in StaticIconImgComponent/XhrImgComponent
      or setting the icon url from the server in the web adapter layer.
      caching works much better with urls that do not have the access token
      query string parameter.
      */
      const iconId = (feed.mapStyle && feed.mapStyle.icon) ? feed.mapStyle.icon.id : feed.icon ? feed.icon.id : null;
      const iconUrl = iconId ? `/api/icons/${iconId}/content?access_token=${LocalStorageService.getToken()}` : '/assets/images/default_marker.png'
      service.createFeedLayer({
        id: `feed-${feed.id}`,
        name: feed.title,
        group: 'feed',
        type: 'geojson',
        geojson: {
          type: 'FeatureCollection',
          features: items
        },
        options: {
          iconWidth: 24,
          selected: true,
          popup: (layer, feature) => {
            MapPopupService.popupFeedItem(layer, feed, feature);
          },
          onLayer: (layer, feature) => {
            MapPopupService.registerFeedItem(layer, feed, feature);
          },
          iconUrl
        }
      });
    });

    changed.updated.filter(geospatialFilter).forEach(({feed, items}) => {
        featuresChanged({
          id: `feed-${feed.id}`,
          updated: items
        });
    });

    changed.removed.filter(({feed}) => {
      return feed.itemsHaveSpatialDimension;
    }).forEach(({feed}) => {
      const layer = feedLayers[`feed-${feed.id}`];
      if (layer) {
        service.removeFeed(layer);
      }
    });
  }

  function onObservationsChanged(changed) {
    _.each(changed.added, function(added) {
      observationsById[added.id] = added;
    });
    if (changed.added.length) service.addFeaturesToLayer(changed.added, 'observations');

    _.each(changed.updated, function(updated) {
      const observation = observationsById[updated.id];
      if (observation) {
        observationsById[updated.id] = updated;
        service.updateFeatureForLayer(updated, 'observations');
      }
    });

    _.each(changed.removed, function(removed) {
      delete observationsById[removed.id];

      service.removeFeatureFromLayer(removed, 'observations');
    });
  }

  function onUsersChanged(changed) {
    _.each(changed.added, function(added) {
      usersById[added.id] = added;
      service.addFeaturesToLayer([added.location], 'people');
    });

    _.each(changed.updated, function(updated) {
      const user = usersById[updated.id];
      if (user) {
        usersById[updated.id] = updated;
        service.updateFeatureForLayer(updated.location, 'people');

        // pan/zoom map to user if this is the user we are following
        if (followFeatureInLayer.layer === 'people' && user.id === followFeatureInLayer.id)
          service.zoomToFeatureInLayer(user, 'people');
      }
    });

    _.each(changed.removed, function(removed) {
      delete usersById[removed.id];
      service.removeFeatureFromLayer(removed.location, 'people');
    });
  }

  function setDelegate(theDelegate) {
    delegate = theDelegate;
  }

  function addListener(listener) {
    listeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      const layers = _.values(rasterLayers).concat(_.values(vectorLayers));
      listener.onLayersChanged({added: layers});
    }

    if (_.isFunction(listener.onFeaturesChanged)) {
      _.each(_.values(vectorLayers), function(vectorLayer) {
        listener.onFeaturesChanged({id: vectorLayer.id, added: _.values(vectorLayer.featuresById)});
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

    rasterLayers[layer.id] = layer;
  }

  function createVectorLayer(layer) {
    layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    vectorLayers[layer.id] = layer;
  }

  function createFeedLayer(layer) {
    layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    feedLayers[layer.id] = layer;
  }

  function createFeature(feature, style, listeners) {
    if (delegate) return delegate.createFeature(feature, style, listeners);
  }

  function addFeaturesToLayer(features, layerId) {
    const vectorLayer = vectorLayers[layerId];
    _.each(features, function(feature) {
      vectorLayer.featuresById[feature.id] = feature;
    });

    featuresChanged({
      id: layerId,
      added: [features]
    });
  }

  function updateFeatureForLayer(feature, layerId) {
    featuresChanged({
      id: layerId,
      updated: [feature]
    });
  }

  function removeFeatureFromLayer(feature, layerId) {
    const vectorLayer = vectorLayers[layerId];
    delete vectorLayer.featuresById[feature.id];

    featuresChanged({
      id: layerId,
      removed: [feature]
    });
  }

  function deselectFeatureInLayer(feature, layerId) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFeatureDeselect)) {
        listener.onFeatureDeselect({
          id: layerId,
          feature: feature
        });
      }
    });
  }

  function zoomToFeatureInLayer(feature, layerId) {
    _.each(listeners, function(listener) {
      if (_.isFunction(listener.onFeatureZoom)) {
        listener.onFeatureZoom({
          id: layerId,
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
    EventService.removeFeedItemsChangedListener(feedItemsChangedListenner);
  }

  function removeLayer(layer) {
    const vectorLayer = vectorLayers[layer.id];
    if (vectorLayer) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(vectorLayer);
        }
      });

      delete vectorLayers[layer.id];
    }

    const rasterLayer = rasterLayers[layer.id];
    if (rasterLayer) {
      _.each(listeners, function(listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(rasterLayer);
        }
      });

      delete rasterLayers[layer.id];
    }
  }

  function removeFeed(feed) {
    const feedLayer = feedLayers[feed.id];
    if (feedLayer) {
      _.each(listeners, function (listener) {
        if (_.isFunction(listener.onFeedRemoved)) {
          listener.onFeedRemoved(feedLayer);
        }
      });

      delete feedLayers[feed.id];
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
