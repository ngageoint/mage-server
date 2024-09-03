import { Injectable } from "@angular/core";
import { EventService } from "../event/event.service";
import { MapPopupService } from "./map-popup.service";
import { LocationService } from "../user/location/location.service";
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

  constructor(
    private eventService: EventService,
    private locationService: LocationService,
    private mapPopupService: MapPopupService,
    private featureService: FeatureService,
    private localStorageService: LocalStorageService
  ) {}

  init () {
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

    this.eventService.addObservationsChangedListener(this);
    this.eventService.addUsersChangedListener(this);
    this.eventService.addLayersChangedListener(this);
    this.eventService.addFeedItemsChangedListener(this)
  }

  destroy() {
    Object.values(this.vectorLayers).forEach((layerInfo: any) => {
      this.listeners.forEach((listener: any) => {
        if (typeof listener.onLayerRemoved === 'function') {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    this.vectorLayers = {};

    Object.values(this.rasterLayers).forEach((layerInfo: any) => {
      this.listeners.forEach((listener: any) => {
        if (typeof listener.onLayerRemoved === 'function') {
          listener.onLayerRemoved(layerInfo);
        }
      });
    });
    this.rasterLayers = {};

    this.listeners = [];

    this.eventService.removeLayersChangedListener(this);
    this.eventService.removeObservationsChangedListener(this);
    this.eventService.removeUsersChangedListener(this);
    this.eventService.removeFeedItemsChangedListener(this);
  }

  onLayersChanged(changed, event) {
    const { added = [], updated = [], removed = [] } = changed

    let baseLayerFound = false;
    added.forEach((layer: any) => {
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
    })

    removed.forEach((layer: any) => {
      this.removeLayer(layer);
    })
  }

  onFeedItemsChanged(changed) {
    const { added = [], updated = [], removed = [] } = changed

    // Filter out non geospatial feeds
    const geospatialFilter = ({ feed }) => { return feed.itemsHaveSpatialDimension; }
    added.filter(geospatialFilter).forEach(({ feed, items }) => {
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

    updated.filter(geospatialFilter).forEach(({ feed, items }) => {
      this.featuresChanged({
        id: `feed-${feed.id}`,
        updated: items
      });
    });

    removed.filter(({ feed }) => {
      return feed.itemsHaveSpatialDimension;
    }).forEach(({ feed }) => {
      const layer = this.feedLayers[`feed-${feed.id}`];
      if (layer) {
        this.removeFeed(layer);
      }
    });
  }

  onObservationsChanged(changed) {
    const { added = [], updated = [], removed = [] } = changed

    added.forEach((added: any) => {
      this.observationsById[added.id] = added;
    })
    if (added.length) this.addFeaturesToLayer(added, 'observations');

    updated.forEach((updated: any) => {
      const observation = this.observationsById[updated.id];
      if (observation) {
        this.observationsById[updated.id] = updated;
        this.updateFeatureForLayer(updated, 'observations');
      }
    })

    removed.forEach((removed: any) => {
      delete this.observationsById[removed.id];
      this.removeFeatureFromLayer(removed, 'observations');
    })
  }

  onUsersChanged(changed) {
    const { added = [], updated = [], removed = [] } = changed

    added.forEach((added: any) => {
      this.usersById[added.id] = added;
      this.addFeaturesToLayer([added.location], 'people');
    })

    updated.forEach((updated: any) => {
      const user = this.usersById[updated.id];
      if (user) {
        this.usersById[updated.id] = updated;
        this.updateFeatureForLayer(updated.location, 'people');

        // pan/zoom map to user if this is the user we are following
        if (this.followedFeature.layer === 'people' && user.id === this.followedFeature.id)
          this.zoomToFeatureInLayer(user, 'people');
      }
    })

    removed.forEach((removed: any) => {
      delete this.usersById[removed.id];
      this.removeFeatureFromLayer(removed.location, 'people');
    })
  }

  setDelegate(theDelegate) {
    this.delegate = theDelegate;
  }

  addListener(listener) {
    this.listeners.push(listener);

    if (typeof listener.onLayersChanged === 'function') {
      const layers = Object.values(this.rasterLayers).concat(Object.values(this.vectorLayers)).concat(Object.values(this.gridLayers));
      listener.onLayersChanged({ added: layers });
    }

    if (typeof listener.onFeaturesChanged === 'function') {
      Object.values(this.vectorLayers).forEach((vectorLayer: any) => {
        listener.onFeaturesChanged({ id: vectorLayer.id, added: Object.values(vectorLayer.featuresById) });
      })
    }

    if (typeof listener.onBaseLayerSelected === 'function') {
      listener.onBaseLayerSelected(this.baseLayer);
    }
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l: any) => l !== listener)
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

  createFeature(feature, style, listeners?: any) {
    if (this.delegate) return this.delegate.createFeature(feature, style, listeners);
  }

  addFeaturesToLayer(features, layerId) {
    const vectorLayer = this.vectorLayers[layerId];
    features.forEach((feature: any) => {
      vectorLayer.featuresById[feature.id] = feature;

    })

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
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onFeatureDeselect === 'function') {
        listener.onFeatureDeselect({
          id: layerId,
          feature: feature
        });
      }
    })
  }

  zoomToFeatureInLayer(feature, layerId) {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onFeatureZoom === 'function') {
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
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onLocation === 'function') {
        listener.onLocation(location);
      }
    });
  }

  onLocationStop() {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onLocationStop === 'function') {
        listener.onLocationStop();
      }
    });
  }

  onBroadcastLocation(callback) {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onBroadcastLocation === 'function') {
        listener.onBroadcastLocation(callback);
      }
    });
  }

  featuresChanged(changed) {
    this.listeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.updated = changed.updated || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onFeaturesChanged === 'function') {
        listener.onFeaturesChanged(changed);
      }
    });
  }

  layersChanged(changed) {
    this.listeners.forEach((listener: any) => {
      changed.added = changed.added || [];
      changed.removed = changed.removed || [];

      if (typeof listener.onLayersChanged === 'function') {
        listener.onLayersChanged(changed);
      }
    });
  }

  selectBaseLayer(layer) {
    this.baseLayer = layer;
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onBaseLayerSelected === 'function') {
        listener.onBaseLayerSelected(layer);
      }
    });
  }

  overlayAdded(overlay) {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onOverlayAdded === 'function') {
        listener.onOverlayAdded(overlay);
      }
    });
  }

  removeLayer(layer) {
    const vectorLayer = this.vectorLayers[layer.id];
    if (vectorLayer) {
      this.listeners.forEach((listener: any) => {
        if (typeof listener.onLayerRemoved === 'function') {
          listener.onLayerRemoved(vectorLayer);
        }
      });

      delete this.vectorLayers[layer.id];
    }

    const rasterLayer = this.rasterLayers[layer.id];
    if (rasterLayer) {
      this.listeners.forEach((listener: any) => {
        if (typeof listener.onLayerRemoved === 'function') {
          listener.onLayerRemoved(rasterLayer);
        }
      });

      delete this.rasterLayers[layer.id];
    }
  }

  removeFeed(feed) {
    const feedLayer = this.feedLayers[feed.id];
    if (feedLayer) {
      this.listeners.forEach((listener: any) => {
        if (typeof listener.onFeedRemoved === 'function') {
          listener.onFeedRemoved(feedLayer);
        }
      });

      delete this.feedLayers[feed.id];
    }
  }

  hideFeed(hide) {
    this.listeners.forEach((listener: any) => {
      if (typeof listener.onHideFeed === 'function') {
        listener.onHideFeed(hide);
      }
    });
  }
}
