import { Injectable } from "@angular/core";
import { EventService } from "../event/event.service";
import { MapPopupService } from "./map-popup.service";
import * as _ from 'underscore';
import { LocationService } from "../location/location.service";
import { LocalStorageService } from "../http/local-storage.service";
import { FeatureService } from "../layer/feature.service";

@Injectable({
  providedIn: 'root'
})
export class MapService {

  followedFeature = {
    id: undefined,
    layer: undefined
  };

  delegate = null;
  baseLayer = null;
  feedLayers = {};
  rasterLayers = {};
  vectorLayers = {};
  gridLayers = {};
  listeners = [];
  observationsById = {};
  usersById = {};

  layersChangedListener = {
    onLayersChanged: this.onLayersChanged
  }

  feedItemsChangedListenner = {
    onFeedItemsChanged: this.onFeedItemsChanged
  }

  usersChangedListener = {
    onUsersChanged: this.onUsersChanged
  }

  observationsChangedListener = {
    onObservationsChanged: this.onObservationsChanged
  }

  constructor(
    private eventService: EventService,
    private locationService: LocationService,
    private mapPopupService: MapPopupService,
    private localStorageService: LocalStorageService
  ) {
    eventService.addObservationsChangedListener(this.observationsChangedListener);
    eventService.addUsersChangedListener(this.usersChangedListener);
    eventService.addLayersChangedListener(this.layersChangedListener);
    eventService.addFeedItemsChangedListener(this.feedItemsChangedListenner)

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
        style: function () {
          return {};
        },
        onEachFeature: function (feature, layer) {
          observationLayer.featureIdToLayer[feature.id] = layer;
        },
        popup: (layer, feature) => {
          this.mapPopupService.popupObservation(layer, feature);
        },
        onLayer: (layer, feature) => {
          this.mapPopupService.registerObservation(layer, feature);
        }
      }
    };

    this.createVectorLayer(observationLayer);

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
          colorBuckets: this.locationService.colorBuckets
        },
        popup: (layer, feature) => {
          this.mapPopupService.popupUser(layer, feature);
        },
        onLayer: (layer, feature) => {
          this.mapPopupService.registerUser(layer, this.usersById[feature.id]);
        }
      }
    };
    this.createVectorLayer(peopleLayer);

    const garsOverlay = {
      id: 'gars',
      name: 'GARS',
      group: 'grid',
      type: 'grid',
      options: {
        selected: false
      }
    }
    this.createGridLayer(garsOverlay);

    const mgrsOverlay = {
      id: 'mgrs',
      name: 'MGRS',
      group: 'grid',
      type: 'grid',
      options: {
        selected: false
      }
    }
    this.createGridLayer(mgrsOverlay);
  }

  onLayersChanged(changed, event) {
    let baseLayerFound = false;
    _.each(changed.added, function (layer) {
      // Add token to the url of all private layers
      // TODO add watch for token change and reset the url for these layers
      if (layer.type === 'Imagery' && layer.url.indexOf('private') === 0) {
        layer.url = layer.url + "?access_token=" + this.localStorageService.getToken();
      }

      if (layer.type === 'Imagery') {
        if (layer.base && !baseLayerFound) {
          layer.options = { selected: true };
          baseLayerFound = true;
        }

        this.createRasterLayer(layer);
      } else if (layer.type === 'Feature') {
        this.featureService.getFeatureCollection(event, layer).subscribe((featureCollection: any) => {
          this.createVectorLayer({
            id: layer.id,
            name: layer.name, // TODO need to track by id as well not just names
            group: 'feature',
            type: 'geojson',
            geojson: featureCollection,
            options: {
              popup: {
                html: function (feature) {
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
        this.createRasterLayer(layer);
      }
    });

    _.each(changed.removed, function (layer) {
      this.removeLayer(layer);
    });
  }

  onFeedItemsChanged(changed) {
    // Filter out non geospatial feeds
    const geospatialFilter = ({ feed }) => { return feed.itemsHaveSpatialDimension; }
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
      const iconUrl = iconId ? `/api/icons/${iconId}/content?access_token=${this.localStorageService.getToken()}` : '/assets/images/default_marker.png'
      this.createFeedLayer({
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
            this.mapPopupService.popupFeedItem(layer, feed, feature);
          },
          onLayer: (layer, feature) => {
            this.mapPopupService.registerFeedItem(layer, feed, feature);
          },
          iconUrl
        }
      });
    });

    changed.updated.filter(geospatialFilter).forEach(({ feed, items }) => {
      this.featuresChanged({
        id: `feed-${feed.id}`,
        updated: items
      });
    });

    changed.removed.filter(({ feed }) => {
      return feed.itemsHaveSpatialDimension;
    }).forEach(({ feed }) => {
      const layer = this.feedLayers[`feed-${feed.id}`];
      if (layer) {
        this.removeFeed(layer);
      }
    });
  }

  onObservationsChanged(changed) {
    _.each(changed.added, function (added) {
      this.observationsById[added.id] = added;
    });
    if (changed.added.length) this.addFeaturesToLayer(changed.added, 'observations');

    _.each(changed.updated, function (updated) {
      const observation = this.observationsById[updated.id];
      if (observation) {
        this.observationsById[updated.id] = updated;
        this.updateFeatureForLayer(updated, 'observations');
      }
    });

    _.each(changed.removed, function (removed) {
      delete this.observationsById[removed.id];

      this.removeFeatureFromLayer(removed, 'observations');
    });
  }

  onUsersChanged(changed) {
    _.each(changed.added, function (added) {
      this.usersById[added.id] = added;
      this.addFeaturesToLayer([added.location], 'people');
    });

    _.each(changed.updated, function (updated) {
      const user = this.usersById[updated.id];
      if (user) {
        this.usersById[updated.id] = updated;
        this.updateFeatureForLayer(updated.location, 'people');

        // pan/zoom map to user if this is the user we are following
        if (this.followFeatureInLayer.layer === 'people' && user.id === this.followFeatureInLayer.id)
          this.zoomToFeatureInLayer(user, 'people');
      }
    });

    _.each(changed.removed, function (removed) {
      delete this.usersById[removed.id];
      this.removeFeatureFromLayer(removed.location, 'people');
    });
  }

  setDelegate(theDelegate) {
    this.delegate = theDelegate;
  }

  addListener(listener) {
    this.listeners.push(listener);

    if (_.isFunction(listener.onLayersChanged)) {
      const layers = _.values(this.rasterLayers).concat(_.values(this.vectorLayers)).concat(_.values(this.gridLayers));
      listener.onLayersChanged({ added: layers });
    }

    if (_.isFunction(listener.onFeaturesChanged)) {
      _.each(_.values(this.vectorLayers), function (vectorLayer) {
        listener.onFeaturesChanged({ id: vectorLayer.id, added: _.values(vectorLayer.featuresById) });
      });
    }

    if (_.isFunction(listener.onBaseLayerSelected) && this.baseLayer) {
      listener.onBaseLayerSelected(this.baseLayer);
    }
  }

  removeListener(listener) {
    this.listeners = _.reject(this.listeners, function (l) { return l === listener; });
  }

  getRasterLayers() {
    return this.rasterLayers;
  }

  getVectorLayers() {
    return this.vectorLayers;
  }

  createRasterLayer(layer) {
    this.layersChanged({
      added: [layer]
    });

    this.rasterLayers[layer.id] = layer;
  }

  createVectorLayer(layer) {
    this.layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    this.vectorLayers[layer.id] = layer;
  }

  createGridLayer(layer) {
    this.layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    this.gridLayers[layer.id] = layer;
  }

  createFeedLayer(layer) {
    this.layersChanged({
      added: [layer]
    });

    layer.featuresById = {};
    this.feedLayers[layer.id] = layer;
  }

  createFeature(feature, style, listeners) {
    if (this.delegate) return this.delegate.createFeature(feature, style, listeners);
  }

  addFeaturesToLayer(features, layerId) {
    const vectorLayer = this.vectorLayers[layerId];
    _.each(features, function (feature) {
      vectorLayer.featuresById[feature.id] = feature;
    });

    this.featuresChanged({
      id: layerId,
      added: [features]
    });
  }

  updateFeatureForLayer(feature, layerId) {
    this.featuresChanged({
      id: layerId,
      updated: [feature]
    });
  }

  removeFeatureFromLayer(feature, layerId) {
    const vectorLayer = this.vectorLayers[layerId];
    delete vectorLayer.featuresById[feature.id];

    this.featuresChanged({
      id: layerId,
      removed: [feature]
    });
  }

  deselectFeatureInLayer(feature, layerId) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onFeatureDeselect)) {
        listener.onFeatureDeselect({
          id: layerId,
          feature: feature
        });
      }
    });
  }

  zoomToFeatureInLayer(feature, layerId) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onFeatureZoom)) {
        listener.onFeatureZoom({
          id: layerId,
          feature: feature
        });
      }
    });
  }

  followFeatureInLayer(feature, layerId) {
    if (feature && (this.followedFeature.id !== feature.id || this.followedFeature.layer !== layerId)) {
      this.followedFeature.id = feature.id;
      this.followedFeature.layer = layerId;
      this.zoomToFeatureInLayer(feature, layerId);
    } else {
      this.followedFeature.id = undefined;
      this.followedFeature.layer = undefined;
    }
  }

  onLocation(location) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onLocation)) {
        listener.onLocation(location);
      }
    });
  }

  onLocationStop() {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onLocationStop)) {
        listener.onLocationStop();
      }
    });
  }

  onBroadcastLocation(callback) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onBroadcastLocation)) {
        listener.onBroadcastLocation(callback);
      }
    });
  }

  featuresChanged(changed) {
    _.each(this.listeners, function (listener) {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onFeaturesChanged)) {
        listener.onFeaturesChanged(changed);
      }
    });
  }

  layersChanged(changed) {
    _.each(this.listeners, function (listener) {
      changed.added = changed.added || [];
      changed.removed = changed.removed || [];

      if (_.isFunction(listener.onLayersChanged)) {
        listener.onLayersChanged(changed);
      }
    });
  }

  selectBaseLayer(layer) {
    this.baseLayer = layer;
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onBaseLayerSelected)) {
        listener.onBaseLayerSelected(layer);
      }
    });
  }

  overlayAdded(overlay) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onOverlayAdded)) {
        listener.onOverlayAdded(overlay);
      }
    });
  }

  destroy() {
    _.each(_.values(this.vectorLayers), function (layerInfo) {
      _.each(this.listeners, function (listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    this.vectorLayers = {};

    _.each(_.values(this.rasterLayers), function (layerInfo) {
      _.each(this.listeners, function (listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    this.rasterLayers = {};

    this.listeners = [];

    this.eventService.removeLayersChangedListener(this.layersChangedListener);
    this.eventService.removeObservationsChangedListener(this.observationsChangedListener);
    this.eventService.removeUsersChangedListener(this.usersChangedListener);
    this.eventService.removeFeedItemsChangedListener(this.feedItemsChangedListenner);
  }

  removeLayer(layer) {
    const vectorLayer = this.vectorLayers[layer.id];
    if (vectorLayer) {
      _.each(this.listeners, function (listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(vectorLayer);
        }
      });

      delete this.vectorLayers[layer.id];
    }

    const rasterLayer = this.rasterLayers[layer.id];
    if (rasterLayer) {
      _.each(this.listeners, function (listener) {
        if (_.isFunction(listener.onLayerRemoved)) {
          listener.onLayerRemoved(rasterLayer);
        }
      });

      delete this.rasterLayers[layer.id];
    }
  }

  removeFeed(feed) {
    const feedLayer = this.feedLayers[feed.id];
    if (feedLayer) {
      _.each(this.listeners, function (listener) {
        if (_.isFunction(listener.onFeedRemoved)) {
          listener.onFeedRemoved(feedLayer);
        }
      });

      delete this.feedLayers[feed.id];
    }
  }

  hideFeed(hide) {
    _.each(this.listeners, function (listener) {
      if (_.isFunction(listener.onHideFeed)) {
        listener.onHideFeed(hide);
      }
    });
  }
}
