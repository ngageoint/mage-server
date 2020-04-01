import { Layer, geoJSON, Map, LatLng, LeafletMouseEvent } from 'leaflet';
import { GeoPackageLayer } from './GeoPackageLayer';
import { Feature, Geometry } from 'geojson';

export default class GeoPackageLayers {
  visibleGeoPackageLayers: GeoPackageLayer[];
  closestLayer: Layer & { feature?: { layerId?: number; gp_table?: string } };
  constructor(
    public map: Map,
    public layerControl: any,
    public LayerService: any,
    public FilterService: any,
    public LocalStorageService: any
  ) {
    this.map = map;
    this.layerControl = layerControl;
    this.LayerService = LayerService;
    this.FilterService = FilterService;
    this.LocalStorageService = LocalStorageService;
    this.visibleGeoPackageLayers = [];

    this.map.on('click', this.mapClickEventHandler.bind(this));
    this.map.on('layeradd', this.mapLayerAdded.bind(this));
    this.map.on('layerremove', this.mapLayerRemoved.bind(this));
  }

  createGeoPackageLayer(table, id, pane): Layer {
    const filteredEvent = this.FilterService.getEvent();
    const layer = new GeoPackageLayer('api/events/' + filteredEvent.id + '/layers/' + id + '/' + table.name + '/{z}/{x}/{y}.png', {
      token: this.LocalStorageService.getToken(),
      minZoom: table.minZoom,
      maxZoom: table.maxZoom,
      layerId: id,
      pane: pane,
      table: table
    });

    return layer;
  }

  mapLayerAdded(event): void {
    if (event.layer.type === 'GeoPackage') {
      this.visibleGeoPackageLayers.push(event.layer);
    }
  }

  mapLayerRemoved(event): void {
    if (event.layer.type === 'GeoPackage') {
      if (
        this.closestLayer &&
        event.layer.layerId === this.closestLayer.feature.layerId &&
        event.layer.table.name === this.closestLayer.feature.gp_table
      ) {
        this.map.removeLayer(this.closestLayer);
      }

      this.visibleGeoPackageLayers = this.visibleGeoPackageLayers.filter(layer => {
        return event.layer.layerId !== layer.layerId;
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

      this.LayerService.getClosestFeaturesForLayers(layers, event.latlng, this.getTileFromPoint(event.latlng)).then(features => {
        if (this.closestLayer) {
          this.map.removeLayer(this.closestLayer);
        }

        if (!features.length) return;

        let popup;
        const layer = this.visibleGeoPackageLayers.find(layer => {
          return layer.layerId === features[0].layerId && layer.table.name === features[0].gp_table;
        });

        this.closestLayer = geoJSON(features[0], {
          pane: layer.pane,
          onEachFeature(
            feature: Feature<Geometry> & { gp_table: string; feature_count: number; coverage: number },
            layer
          ) {
            let geojsonPopupHtml = '<div class="geojson-popup"><h6>' + feature.gp_table + '</h6>';
            if (feature.coverage) {
              geojsonPopupHtml += 'There are ' + feature.feature_count + ' features in this area.';
            } else {
              geojsonPopupHtml += '<table>';
              for (const key in feature.properties) {
                if (feature.properties.hasOwnProperty(key) && feature.properties[key] !== Object(feature.properties[key])) {
                  geojsonPopupHtml +=
                    '<tr><td class="title" style="padding-right: 8px;">' +
                    key +
                    '</td><td class="text">' +
                    feature.properties[key] +
                    '</td></tr>';
                }
              }
              geojsonPopupHtml += '</table>';
            }
            geojsonPopupHtml += '</div>';
            popup = layer.bindPopup(geojsonPopupHtml, {
              maxHeight: 300
            });
          }
        }).getLayers()[0] as Layer;
        this.map.addLayer(this.closestLayer);
        if (popup) {
          popup.openPopup(event.latlng);
        }
      });
    }
  }
}
