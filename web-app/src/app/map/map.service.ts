import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { filter, map, pairwise, takeUntil } from "rxjs/operators";
import * as _ from "lodash";
import { EventService } from "../event/event.service";
import { MapPopupService } from "./map-popup.service";
import { LocationService } from "../user/location/location.service";
import { SessionService } from "../http/session.service";
import { FeatureService } from "../layer/feature.service";
import { GeoPackageLayer, GridOverlay, MapFeature, MapLayer, MapLayerId, RasterLayer, RenderedRasterLayer, VectorLayer } from "./entities.map-layer";
import { Layer } from "../entities/layer/entities.layer";
import { MageEvent } from "../entities/event/entities.event";
import { Feed } from "@ngageoint/mage.web-core-lib/feed";
import { LocationEvent as LeafletLocationEvent } from "leaflet";

export interface FeatureEdit {
  update(feature: any): void;
  cancel(): void;
  save(): void;
}

interface FeatureEditDelegate {
  geometryChanged?: (geometry: any) => void;
  vertexClick?: (vertex: any) => void;
}

interface MapDelegate {
  createFeature(feature: MapFeature, delegate: FeatureEditDelegate): FeatureEdit | undefined;
}

interface FeaturesChanged {
  id: string;
  added?: MapFeature[];
  updated?: MapFeature[];
  removed?: Pick<MapFeature, 'id'>[];
}

interface FeedItemsChanged {
  added?: { feed: Feed, items: MapFeature[] }[];
  updated?: { feed: Feed, items: MapFeature[] }[];
  removed?: { feed: Feed }[];
}

function hasId<T extends Partial<Pick<MapFeature, 'id'>>>(feature: T): feature is T & Pick<MapFeature, 'id'> {
  return feature.id !== undefined;
}

interface MapListener {
  onLayersChanged?(changed: { added: MapLayer[] }): void;
  onFeaturesChanged?(changed: FeaturesChanged): void;
  onLayerRemoved?(layer: MapLayer): void;
  onFeedRemoved?(feed: VectorLayer): void;
  onFeatureZoom?(zoom: { id: string, feature: Pick<MapFeature, 'id'> }): void;
  onFeatureDeselect?(deselected: { id: string, feature: Pick<MapFeature, 'id'> }): void;
  onBaseLayerSelected?(layer: RenderedRasterLayer | null): void;
  onLocation?(location: LeafletLocationEvent): void;
  onLocationStop?(): void;
}

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private destroy$ = new Subject<void>();

  followedFeature: { id: string | number | undefined, layer: string | undefined } = {
    id: undefined,
    layer: undefined
  };

  delegate: MapDelegate | null = null;
  baseLayer: RenderedRasterLayer | null = null;
  feedLayers: Record<string, VectorLayer> = {};
  rasterLayers: Record<string, RasterLayer | GeoPackageLayer> = {};
  vectorLayers: Record<string, VectorLayer> = {};
  gridLayers: Record<string, GridOverlay> = {};
  // Features currently in each vector/feed layer, keyed by layer id then feature id -
  // MapService's own bookkeeping, kept separate from the VectorLayer definitions above.
  private featuresByLayerId: Record<string, Record<string, MapFeature>> = {};
  // One server GeoPackage Layer explodes into one rasterLayers entry per table -
  // this tracks which exploded ids came from which original layer id, so removal
  // (which only ever gets the original id) can find and remove them all.
  private explodedLayerIds: Record<string, string[]> = {};
  listeners: MapListener[] = [];
  observationsById: Record<string, any> = {};
  usersById: Record<string, any> = {};

  constructor(
    private eventService: EventService,
    private locationService: LocationService,
    private mapPopupService: MapPopupService,
    private featureService: FeatureService,
    private sessionService: SessionService
  ) {}

  init () {
    this.destroy$ = new Subject<void>();

    const observationLayer: VectorLayer = {
      id: 'observations',
      name: 'Observations',
      group: 'mage',
      type: 'vector',
      selectedByDefault: true,
      cluster: true,
      renderHooks: {
        popup: (layer, feature) => {
          this.mapPopupService.popupObservation(layer, feature);
        },
        onLayer: (layer, feature) => {
          this.mapPopupService.registerObservation(layer, feature);
        }
      }
    };

    this.createVectorLayer(observationLayer);

    const peopleLayer: VectorLayer = {
      id: 'people',
      name: 'People',
      group: 'mage',
      type: 'vector',
      selectedByDefault: true,
      cluster: false,
      temporal: {
        property: 'timestamp',
        colorBuckets: this.locationService.colorBuckets
      },
      renderHooks: {
        popup: (layer, feature) => {
          this.mapPopupService.popupUser(layer, feature);
        },
        onLayer: (layer, feature) => {
          this.mapPopupService.registerUser(layer, this.usersById[feature.id]);
        }
      }
    };
    this.createVectorLayer(peopleLayer);

    const garsOverlay: GridOverlay = {
      id: 'gars',
      name: 'GARS',
      type: 'grid',
      selectedByDefault: false
    }
    this.createGridLayer(garsOverlay);

    const mgrsOverlay: GridOverlay = {
      id: 'mgrs',
      name: 'MGRS',
      type: 'grid',
      selectedByDefault: false
    }
    this.createGridLayer(mgrsOverlay);

    this.eventService.mapObservations$.pipe(
      filter(obs => obs !== null),
      pairwise(),
      takeUntil(this.destroy$)
    ).subscribe(([prev, curr]) => {
      const prevById = _.keyBy(prev, 'id')
      const currById = _.keyBy(curr, 'id')

      const added = curr.filter((o: any) => !prevById[o.id])
      const updated = curr.filter((o: any) => prevById[o.id] && (prevById[o.id] as any).lastModified !== o.lastModified)
      const removed = prev.filter((o: any) => !currById[o.id])

      added.forEach((o: any) => { this.observationsById[o.id] = o })
      if (added.length) this.addFeaturesToLayer(added as unknown as MapFeature[], 'observations')

      updated.forEach((o: any) => {
        if (this.observationsById[o.id]) {
          this.observationsById[o.id] = o
          this.updateFeatureForLayer(o, 'observations')
        }
      })

      removed.forEach((o: any) => {
        delete this.observationsById[o.id]
        this.removeFeatureFromLayer(o, 'observations')
      })
    })

    this.eventService.locations$.pipe(
      filter(result => result !== null),
      map(result => result.data),
      pairwise(),
      takeUntil(this.destroy$)
    ).subscribe(([prev, curr]) => {
      const prevById = _.keyBy(prev, 'id')
      const currById = _.keyBy(curr, 'id')

      const added = curr.filter((u: any) => !prevById[u.id])
      const updated = curr.filter((u: any) => prevById[u.id] && prevById[u.id].location.properties.timestamp !== u.location.properties.timestamp)
      const removed = prev.filter((u: any) => !currById[u.id])

      added.forEach((u: any) => {
        this.usersById[u.id] = u
        this.addFeaturesToLayer([u.location], 'people')
      })

      updated.forEach((u: any) => {
        const user = this.usersById[u.id]
        if (user) {
          this.usersById[u.id] = u
          this.updateFeatureForLayer(u.location, 'people')
          if (this.followedFeature.layer === 'people' && user.id === this.followedFeature.id)
            this.zoomToFeatureInLayer(u, 'people')
        }
      })

      removed.forEach((u: any) => {
        delete this.usersById[u.id]
        this.removeFeatureFromLayer(u.location, 'people')
      })
    })

    this.eventService.addLayersChangedListener(this);
    this.eventService.addFeedItemsChangedListener(this)
  }

  destroy() {
    Object.values(this.vectorLayers).forEach(layerInfo => {
      this.listeners.forEach(listener => {
        listener.onLayerRemoved?.(layerInfo);
      });
    });
    this.vectorLayers = {};
    this.featuresByLayerId = {};

    Object.values(this.rasterLayers).forEach(layerInfo => {
      this.listeners.forEach(listener => {
        listener.onLayerRemoved?.(layerInfo);
      });
    });
    this.rasterLayers = {};
    this.explodedLayerIds = {};

    this.listeners = [];
    this.delegate = null;

    this.destroy$.next();
    this.destroy$.complete();
    this.eventService.removeLayersChangedListener(this);
    this.eventService.removeFeedItemsChangedListener(this);
  }

  onLayersChanged(changed: { added?: Layer[], removed?: MapLayerId[] }, event: MageEvent) {
    const { added = [], removed = [] } = changed

    let baseLayerFound = false;
    added.forEach((layer: Layer) => {
      if (layer.type === 'Imagery') {
        if (!layer.format) {
          console.error(`Imagery layer ${layer.id} has no format, skipping`);
          return;
        }

        // Add token to the url of all private layers
        // TODO add watch for token change and reset the url for these layers
        let url = layer.url ?? '';
        if (url.indexOf('private') === 0) {
          url = url + "?access_token=" + this.sessionService.getToken();
        }

        const selectedByDefault = (layer.base ?? false) && !baseLayerFound;
        if (selectedByDefault) baseLayerFound = true;

        const rasterLayer: RasterLayer = layer.format === 'WMS'
          ? {
              type: 'Imagery', id: layer.id, name: layer.name, url, base: layer.base, selectedByDefault,
              format: 'WMS',
              wms: {
                layers: layer.wms?.layers ?? '',
                version: layer.wms?.version ?? '1.1.1',
                format: layer.wms?.format ?? 'image/png',
                transparent: layer.wms?.transparent ?? true,
                styles: layer.wms?.styles
              }
            }
          : { type: 'Imagery', id: layer.id, name: layer.name, url, base: layer.base, selectedByDefault, format: layer.format };

        this.createRasterLayer(rasterLayer);
      } else if (layer.type === 'Feature') {
        this.featureService.getFeatureCollection(event, layer).subscribe((featureCollection: GeoJSON.FeatureCollection) => {
          const vectorLayer: VectorLayer = {
            id: String(layer.id),
            name: layer.name, // TODO need to track by id as well not just names
            group: 'feature',
            type: 'vector',
            renderHooks: {
              popup: {
                html: function (feature: MapFeature) {
                  // TODO use leaflet template for this
                  let content = "";
                  if (feature.properties?.name) {
                    content += '<div><strong><u>' + feature.properties.name + '</u></strong></div>';
                  }
                  if (feature.properties?.description) {
                    content += '<div>' + feature.properties.description + '</div>';
                  }

                  return content;
                }
              }
            }
          };
          this.createVectorLayer(vectorLayer);
          this.addFeaturesToLayer(featureCollection.features as MapFeature[], vectorLayer.id);
        });
      } else if (layer.type === 'GeoPackage') {
        const childIds = (layer.tables ?? []).map(table => {
          const geoPackageLayer: GeoPackageLayer = {
            type: 'GeoPackage',
            id: `${layer.id}-${table.name}`,
            layerId: layer.id,
            name: table.name,
            renderAs: table.type,
            url: `api/events/${event.id}/layers/${layer.id}/${table.name}/{z}/{x}/{y}.png`,
            minZoom: table.minZoom,
            maxZoom: table.maxZoom,
            bbox: table.bbox
          };
          this.createRasterLayer(geoPackageLayer);
          return geoPackageLayer.id;
        });
        this.explodedLayerIds[layer.id] = childIds;
      }
    })

    removed.forEach((id: MapLayerId) => {
      (this.explodedLayerIds[id] ?? [id]).forEach(childId => this.removeLayer(childId));
      delete this.explodedLayerIds[id];
    })
  }

  onFeedItemsChanged(changed: FeedItemsChanged) {
    const { added = [], updated = [], removed = [] } = changed

    // Filter out non geospatial feeds
    const geospatialFilter = ({ feed }: { feed: Feed }) => { return feed.itemsHaveSpatialDimension; }
    added.filter(geospatialFilter).forEach(({ feed, items }) => {
      // TODO: the access token query string parameter means these icon urls
      // bust the browser cache on every login. Static icons now use this
      // same approach (see StaticIconImgComponent) since it at least caches
      // and coalesces requests within a session, unlike the XHR/blob approach
      // it replaced, but a longer-term fix (e.g. cookie-based auth for this
      // route) would avoid the per-login cache miss entirely.
      const iconId = (feed.mapStyle && feed.mapStyle.icon) ? feed.mapStyle.icon.id : feed.icon ? feed.icon.id : null;
      const iconUrl = iconId ? `/api/icons/${iconId}/content?access_token=${this.sessionService.getToken()}` : '/assets/images/default_marker.png'
      const feedLayer: VectorLayer = {
        id: `feed-${feed.id}`,
        name: feed.title,
        group: 'feed',
        type: 'vector',
        iconWidth: 24,
        iconUrl,
        selectedByDefault: feed.showOnMapByDefault != undefined ? feed.showOnMapByDefault : false,
        renderHooks: {
          popup: (layer, feature) => {
            this.mapPopupService.popupFeedItem(layer, feed, feature);
          },
          onLayer: (layer, feature) => {
            this.mapPopupService.registerFeedItem(layer, feed, feature);
          }
        }
      };
      this.createFeedLayer(feedLayer);
      this.addFeaturesToLayer(items, feedLayer.id);
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


  setDelegate(theDelegate: MapDelegate) {
    this.delegate = theDelegate;
  }

  addListener(listener: MapListener) {
    this.listeners.push(listener);

    const layers: MapLayer[] = [
      ...Object.values(this.rasterLayers),
      ...Object.values(this.vectorLayers),
      ...Object.values(this.gridLayers)
    ];
    listener.onLayersChanged?.({ added: layers });

    Object.values(this.vectorLayers).forEach((vectorLayer: VectorLayer) => {
      listener.onFeaturesChanged?.({ id: vectorLayer.id, added: Object.values(this.featuresByLayerId[vectorLayer.id] ?? {}) });
    })

    listener.onBaseLayerSelected?.(this.baseLayer);
  }

  removeListener(listener: MapListener) {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  getRasterLayers() {
    return this.rasterLayers;
  }

  getVectorLayers() {
    return this.vectorLayers;
  }

  createRasterLayer(layer: RasterLayer | GeoPackageLayer) {
    this.layersChanged({
      added: [layer]
    });

    this.rasterLayers[layer.id] = layer;
  }

  createVectorLayer(layer: VectorLayer) {
    this.layersChanged({
      added: [layer]
    });

    this.featuresByLayerId[layer.id] = {};
    this.vectorLayers[layer.id] = layer;
  }

  createGridLayer(layer: GridOverlay) {
    this.layersChanged({
      added: [layer]
    });

    this.gridLayers[layer.id] = layer;
  }

  createFeedLayer(layer: VectorLayer) {
    this.layersChanged({
      added: [layer]
    });

    this.featuresByLayerId[layer.id] = {};
    this.feedLayers[layer.id] = layer;
  }

  createFeature(feature: MapFeature, delegate: FeatureEditDelegate): FeatureEdit | undefined {
    if (this.delegate) return this.delegate.createFeature(feature, delegate);
    return undefined;
  }

  addFeaturesToLayer(features: MapFeature[], layerId: string) {
    const featuresById = this.featuresByLayerId[layerId] ?? (this.featuresByLayerId[layerId] = {});
    features.forEach((feature: MapFeature) => {
      featuresById[feature.id] = feature;
    })

    this.featuresChanged({
      id: layerId,
      added: features
    });
  }

  updateFeatureForLayer(feature: MapFeature, layerId: string) {
    this.featuresChanged({
      id: layerId,
      updated: [feature]
    });
  }

  removeFeatureFromLayer(feature: Pick<MapFeature, 'id'>, layerId: string) {
    delete this.featuresByLayerId[layerId]?.[feature.id];

    this.featuresChanged({
      id: layerId,
      removed: [feature]
    });
  }

  deselectFeatureInLayer(feature: Partial<Pick<MapFeature, 'id'>>, layerId: string) {
    if (!hasId(feature)) return;
    this.listeners.forEach(listener => {
      listener.onFeatureDeselect?.({ id: layerId, feature });
    })
  }

  zoomToFeatureInLayer(feature: Partial<Pick<MapFeature, 'id'>>, layerId: string) {
    if (!hasId(feature)) return;
    this.listeners.forEach(listener => {
      listener.onFeatureZoom?.({ id: layerId, feature });
    });
  }

  followFeatureInLayer(feature: Partial<Pick<MapFeature, 'id'>>, layerId: string) {
    if (feature && (this.followedFeature.id !== feature.id || this.followedFeature.layer !== layerId)) {
      this.followedFeature.id = feature.id;
      this.followedFeature.layer = layerId;
      this.zoomToFeatureInLayer(feature, layerId);
    } else {
      this.followedFeature.id = undefined;
      this.followedFeature.layer = undefined;
    }
  }

  onLocation(location: LeafletLocationEvent) {
    this.listeners.forEach(listener => {
      listener.onLocation?.(location);
    });
  }

  onLocationStop() {
    this.listeners.forEach(listener => {
      listener.onLocationStop?.();
    });
  }

  featuresChanged(changed: FeaturesChanged) {
    this.listeners.forEach(listener => {
      listener.onFeaturesChanged?.(changed);
    });
  }

  layersChanged(changed: { added: MapLayer[] }) {
    this.listeners.forEach(listener => {
      listener.onLayersChanged?.(changed);
    });
  }

  selectBaseLayer(layer: RenderedRasterLayer) {
    this.baseLayer = layer;
    this.listeners.forEach(listener => {
      listener.onBaseLayerSelected?.(layer);
    });
  }

  removeLayer(id: MapLayerId) {
    const vectorLayer = this.vectorLayers[id];
    if (vectorLayer) {
      this.listeners.forEach(listener => {
        listener.onLayerRemoved?.(vectorLayer);
      });

      delete this.vectorLayers[id];
      delete this.featuresByLayerId[id];
    }

    const rasterLayer = this.rasterLayers[id];
    if (rasterLayer) {
      this.listeners.forEach(listener => {
        listener.onLayerRemoved?.(rasterLayer);
      });

      delete this.rasterLayers[id];
    }
  }

  removeFeed(feedLayer: VectorLayer) {
    if (this.feedLayers[feedLayer.id]) {
      this.listeners.forEach(listener => {
        listener.onFeedRemoved?.(feedLayer);
      });

      delete this.feedLayers[feedLayer.id];
    }
  }
}
