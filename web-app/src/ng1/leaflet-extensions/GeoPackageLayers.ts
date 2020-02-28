import { Layer, geoJSON, GeoJSON as GeoJSONLayer, Map, LatLng, LeafletMouseEvent } from 'leaflet';
import { GeoPackageLayer } from './GeoPackageLayer';
import { Feature, Geometry } from 'geojson';

export default class GeoPackageLayers {
  visibleGeoPackageLayers: {
    id: string;
    table: string;
  }[];
  closestLayer: GeoJSONLayer;
  constructor(
    public map: Map,
    public layerControl: any,
    public pane: string,
    public LayerService: any,
    public FilterService: any,
    public LocalStorageService: any,
  ) {
    this.map = map;
    this.layerControl = layerControl;
    this.pane = pane;
    this.LayerService = LayerService;
    this.FilterService = FilterService;
    this.LocalStorageService = LocalStorageService;
    this.visibleGeoPackageLayers = [];

    this.map.on('click', this.mapClickEventHandler.bind(this));
    this.map.on('layeradd', this.mapLayerAdded.bind(this));
    this.map.on('layerremove', this.mapLayerRemoved.bind(this));
  }

  createGeoPackageLayer(geoPackageLayer): { leafletLayer: Layer; tableName: string; geoPackageLayerName: string }[] {
    const newLayerInfos = [];
    const filteredEvent = this.FilterService.getEvent();
    geoPackageLayer.tables.forEach(table => {
      table.layer = new GeoPackageLayer(
        'api/events/' +
          filteredEvent.id +
          '/layers/' +
          geoPackageLayer.id +
          '/' +
          table.name +
          '/{z}/{x}/{y}.png?access_token={token}',
        {
          token: this.LocalStorageService.getToken(),
          geoPackageLayer: {
            id: geoPackageLayer.id,
            table: table.name,
          },
          minZoom: table.minZoom,
          maxZoom: table.maxZoom,
          pane: this.pane,
        },
      );
      newLayerInfos.push({
        leafletLayer: table.layer,
        tableName: table.name,
        geoPackageLayerName: geoPackageLayer.name,
      });
    });
    return newLayerInfos;
  }

  removeGeoPackageLayer(layer): void {
    layer.tables.forEach(table => {
      this.map.removeLayer(table.layer);
      this.layerControl.removeLayer(table.layer);
    });
  }

  mapLayerAdded(event): void {
    if (event.layer.options.geoPackageLayer) {
      this.visibleGeoPackageLayers.push(event.layer.options.geoPackageLayer);
    }
  }

  mapLayerRemoved(event): void {
    if (event.layer.options.geoPackageLayer) {
      this.visibleGeoPackageLayers = this.visibleGeoPackageLayers.filter(value => {
        return (
          value.id !== event.layer.options.geoPackageLayer.id &&
          value.table !== event.layer.options.geoPackageLayer.table
        );
      });
    }
  }

  getTileFromPoint(latlng: LatLng): { z: number; x: number; y: number } {
    const xtile = parseInt(Math.floor(((latlng.lng + 180) / 360) * (1 << this.map.getZoom())).toString(), 10);
    const ytile = parseInt(
      Math.floor(
        ((1 - Math.log(Math.tan(this.toRadians(latlng.lat)) + 1 / Math.cos(this.toRadians(latlng.lat))) / Math.PI) /
          2) *
          (1 << this.map.getZoom()),
      ).toString(),
      10,
    );
    return {
      z: this.map.getZoom(),
      x: xtile,
      y: ytile,
    };
  }

  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180.0);
  }

  mapClickEventHandler(event: LeafletMouseEvent): void {
    if (this.visibleGeoPackageLayers.length) {
      this.LayerService.getClosestFeaturesForLayers(
        this.visibleGeoPackageLayers,
        event.latlng,
        this.getTileFromPoint(event.latlng),
      ).then(features => {
        let popup;
        if (this.closestLayer) {
          this.map.removeLayer(this.closestLayer);
        }
        this.closestLayer = geoJSON(features[0], {
          onEachFeature(
            feature: Feature<Geometry> & { gp_table: string; feature_count: number; coverage: number },
            layer,
          ) {
            let geojsonPopupHtml = '<div class="geojson-popup"><h6>' + feature.gp_table + '</h6>';
            if (feature.coverage) {
              geojsonPopupHtml += 'There are ' + feature.feature_count + ' features in this area.';
            } else {
              geojsonPopupHtml += '<table>';
              for (const property in feature.properties) {
                if (Object.prototype.hasOwnProperty.call(feature.properties, property)) {
                  geojsonPopupHtml +=
                    '<tr><td class="title">' +
                    property +
                    '</td><td class="text">' +
                    feature.properties[property] +
                    '</td></tr>';
                }
              }
              geojsonPopupHtml += '</table>';
            }
            geojsonPopupHtml += '</div>';
            popup = layer.bindPopup(geojsonPopupHtml, {
              maxHeight: 300,
            });
          },
        });
        this.map.addLayer(this.closestLayer);
        if (popup) {
          popup.openPopup();
        }
      });
    }
  }
}

// module.exports = GeoPackageLayers;
