import { Layer, LayerEvent, geoJSON, Map, LatLng, LeafletMouseEvent } from 'leaflet';
import { GeoPackageRasterLayer } from './GeoPackageLayer';
import { SessionService } from 'src/app/http/session.service';
import { ClosestFeature, LayerService } from '../../layer/layer.service';
import { FilterService } from '../../filter/filter.service';
import { GeoPackageLayer } from '../entities.map-layer';

export default class GeoPackageLayers {
  visibleGeoPackageLayers: GeoPackageRasterLayer[];
  closestLayer?: Layer & { feature?: { layerId?: number; gp_table?: string } };
  constructor(
    public map: Map,
    public layerService: LayerService,
    public filterService: FilterService,
    public sessionService: SessionService
  ) {
    this.map = map;
    this.layerService = layerService;
    this.filterService = filterService;
    this.sessionService = sessionService;
    this.visibleGeoPackageLayers = [];

    this.map.on('click', this.mapClickEventHandler.bind(this));
    this.map.on('layeradd', this.mapLayerAdded.bind(this));
    this.map.on('layerremove', this.mapLayerRemoved.bind(this));
  }

  createGeoPackageLayer(layerInfo: GeoPackageLayer, pane: string): Layer {
    const layer = new GeoPackageRasterLayer(layerInfo.url, {
      token: this.sessionService.getToken(),
      minZoom: layerInfo.minZoom,
      maxZoom: layerInfo.maxZoom,
      layerId: layerInfo.layerId,
      pane: pane,
      table: {
        name: layerInfo.name,
        type: layerInfo.renderAs,
        minZoom: layerInfo.minZoom,
        maxZoom: layerInfo.maxZoom,
        bbox: layerInfo.bbox
      }
    });

    return layer;
  }

  mapLayerAdded(event: LayerEvent): void {
    if (event.layer instanceof GeoPackageRasterLayer) {
      this.visibleGeoPackageLayers.push(event.layer);
    }
  }

  mapLayerRemoved(event: LayerEvent): void {
    const removed = event.layer;
    if (removed instanceof GeoPackageRasterLayer) {
      if (
        this.closestLayer &&
        this.closestLayer.feature &&
        removed.layerId === this.closestLayer.feature.layerId &&
        removed.table.name === this.closestLayer.feature.gp_table
      ) {
        this.map.removeLayer(this.closestLayer);
      }

      this.visibleGeoPackageLayers = this.visibleGeoPackageLayers.filter(layer => {
        return removed.layerId !== layer.layerId;
      });
    }
  }

  getTileFromPoint(latlng: LatLng): { z: number; x: number; y: number } {
    const xtile = parseInt(Math.floor(((latlng.lng + 180) / 360) * (1 << this.map.getZoom())).toString(), 10);
    const ytile = parseInt(
      Math.floor(
        ((1 - Math.log(Math.tan(this.toRadians(latlng.lat)) + 1 / Math.cos(this.toRadians(latlng.lat))) / Math.PI) /
          2) *
          (1 << this.map.getZoom())
      ).toString(),
      10
    );
    return {
      z: this.map.getZoom(),
      x: xtile,
      y: ytile
    };
  }

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180.0);
  }

  mapClickEventHandler(event: LeafletMouseEvent): void {
    if (this.closestLayer) {
      this.map.removeLayer(this.closestLayer);
    }

    if (this.visibleGeoPackageLayers.length) {
      const layers = this.visibleGeoPackageLayers.map(layer => {
        return {
          id: layer.layerId,
          table: layer.table.name
        };
      });

      const mageEvent = this.filterService.getEvent()
      if (!mageEvent) return
      this.layerService.getClosestFeaturesForLayers(mageEvent, layers, event.latlng, this.getTileFromPoint(event.latlng)).subscribe((features: ClosestFeature[]) => {
        if (this.closestLayer) {
          this.map.removeLayer(this.closestLayer);
        }

        if (!features.length) return;

        const layer = this.visibleGeoPackageLayers.find(layer => {
          return layer.layerId === features[0].layerId && layer.table.name === features[0].gp_table;
        });
        if (!layer) {
          throw new Error(`no layer found for id ${features[0].layerId}`)
        }

        const closestLayer = geoJSON(features[0], { pane: layer.pane }).getLayers()[0]
        closestLayer.bindPopup(this.popupHtml(features[0]), { maxHeight: 300 })
        this.closestLayer = closestLayer
        this.map.addLayer(closestLayer);
        closestLayer.openPopup(event.latlng);
      });
    }
  }

  private popupHtml(feature: ClosestFeature): string {
    let html = '<div class="geojson-popup"><h6>' + feature.gp_table + '</h6>';
    if (feature.coverage) {
      html += 'There are ' + feature.feature_count + ' features in this area.';
    } else {
      html += '<table>';
      for (const key in feature.properties) {
        if (feature.properties.hasOwnProperty(key) && feature.properties[key] !== Object(feature.properties[key])) {
          html +=
            '<tr><td class="title" style="padding-right: 8px;">' +
            key +
            '</td><td class="text">' +
            feature.properties[key] +
            '</td></tr>';
        }
      }
      html += '</table>';
    }
    html += '</div>';
    return html;
  }
}
