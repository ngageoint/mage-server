import {
  Component,
  input,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  viewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import * as L from 'leaflet';

import { Layer } from '../layers.service';
import { SessionService } from 'mage-web-app/http/session.service';

interface LayerBounds {
  bounds?: number[];
}

@Component({
    selector: 'mage-layer-preview',
    templateUrl: './layer-preview.component.html',
    styleUrls: ['./layer-preview.component.scss'],
    standalone: true,
    imports: [MatIconModule]
})
export class LayerPreviewComponent implements AfterViewInit, OnChanges {
  layer = input.required<Layer & LayerBounds>();
  mapContainer = viewChild<ElementRef>('mapContainer');

  private map?: L.Map;
  private mapLayer?: L.Layer;

  constructor(
    private http: HttpClient,
    private sessionService: SessionService
  ) {}

  ngAfterViewInit(): void {
    this.initializeMap();
    this.updateMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['layer'] && !changes['layer'].firstChange) {
      this.updateMap();
    }
  }

  private initializeMap(): void {
    const container = this.mapContainer();
    if (!container?.nativeElement) return;

    this.map = L.map(container.nativeElement, {
      center: [0, 0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: false,
      attributionControl: true,
      worldCopyJump: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.map);
  }

  private updateMap(): void {
    const layer = this.layer();
    if (!this.map) return;

    if (this.mapLayer) {
      this.map.removeLayer(this.mapLayer);
      this.mapLayer = undefined;
    }

    if (layer.type === 'Feature') {
      this.addFeatureLayer();
    } else if (layer.type === 'Imagery') {
      this.addImageryLayer();
    } else if (layer.type === 'GeoPackage' && layer.tables) {
      this.addGeoPackageLayer();
    }

    if (layer.bounds && layer.bounds.length === 4) {
      const bounds = L.latLngBounds(
        [layer.bounds[1], layer.bounds[0]],
        [layer.bounds[3], layer.bounds[2]]
      );
      this.map.fitBounds(bounds);
    }
  }

  private addFeatureLayer(): void {
    const url = `/api/layers/${this.layer().id}/features`;

    this.http.get<any>(url).subscribe({
      next: (featureCollection) => {
        if (!this.map) return;

        const gjLayer = L.geoJSON(featureCollection, {
          pointToLayer: (feature: any, latlng) => {
            const options: any = {};
            const featureStyle = feature.properties?.style;

            if (featureStyle?.iconStyle?.icon?.href) {
              const icon = L.icon({
                iconUrl: featureStyle.iconStyle.icon.href,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
              });
              options.icon = icon;
            }

            return L.marker(latlng, options);
          },
          style: (feature: any) => {
            const featureStyle = feature.properties?.style;
            const style: any = {};

            if (featureStyle?.lineStyle?.color) {
              style.color = featureStyle.lineStyle.color.rgb;
            }

            if (featureStyle?.polyStyle?.color) {
              style.fillColor = featureStyle.polyStyle.color.rgb;
              style.fillOpacity = featureStyle.polyStyle.color.opacity / 255;
            }

            return style;
          }
        });

        gjLayer.addTo(this.map);
        this.mapLayer = gjLayer;

        const bounds = gjLayer.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds);
        }
      },
      error: (error) => {
        console.error('Error loading feature layer:', error);
      }
    });
  }

  private addImageryLayer(): void {
    const layer = this.layer();
    if (!this.map || !layer.url || !layer.format) return;

    if (layer.format === 'XYZ' || layer.format === 'TMS') {
      const options: L.TileLayerOptions = {
        maxZoom: 18,
        tms: layer.format === 'TMS'
      };

      this.mapLayer = L.tileLayer(layer.url, options).addTo(this.map);
      return;
    }

    if (layer.format === 'WMS' && layer.wms) {
      const options: L.WMSOptions = {
        layers: layer.wms.layers || '',
        version: layer.wms.version || '1.3.0',
        format: layer.wms.format || 'image/png',
        transparent: layer.wms.transparent ?? true
      };

      if (layer.wms.styles) {
        options.styles = layer.wms.styles;
      }

      this.mapLayer = L.tileLayer.wms(layer.url, options).addTo(this.map);

      if (layer.wms.extent && layer.wms.extent.length === 4) {
        const bounds = L.latLngBounds(
          [layer.wms.extent[1], layer.wms.extent[0]],
          [layer.wms.extent[3], layer.wms.extent[2]]
        );
        this.map.fitBounds(bounds);
      }
    }
  }

  private addGeoPackageLayer(): void {
    const layer = this.layer();
    if (!this.map || !layer.tables || layer.tables.length === 0)
      return;

    const accessToken = this.sessionService.getToken();

    layer.tables.forEach((table) => {
      const url = `/api/layers/${layer.id}/${
        table.name
      }/{z}/{x}/{y}.png?access_token=${accessToken}`;

      const tileLayer = L.tileLayer(url, { maxZoom: 18 }).addTo(this.map!);

      if (!this.mapLayer) {
        this.mapLayer = tileLayer;
      }
    });
  }

  shouldShowMap(): boolean {
    const layer = this.layer();
    return (
      layer.type === 'Imagery' ||
      layer.type === 'Feature' ||
      (layer.type === 'GeoPackage' && Boolean(layer.tables?.length))
    );
  }
}
