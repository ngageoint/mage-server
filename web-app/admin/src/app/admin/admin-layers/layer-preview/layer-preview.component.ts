import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

import { Layer } from '../layers.service';
import { LocalStorageService } from '../../../../../../../web-app/src/app/http/local-storage.service';

interface LayerBounds {
  bounds?: number[];
}

@Component({
  selector: 'mage-layer-preview',
  templateUrl: './layer-preview.component.html',
  styleUrls: ['./layer-preview.component.scss']
})
export class LayerPreviewComponent implements AfterViewInit, OnChanges {
  @Input() layer!: Layer & LayerBounds;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private map?: L.Map;
  private mapLayer?: L.Layer;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService
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
    if (!this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [0, 0],
      zoom: 3,
      minZoom: 0,
      maxZoom: 18,
      zoomControl: true,
      trackResize: true,
      scrollWheelZoom: true,
      attributionControl: true,
      worldCopyJump: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.map);
  }

  private updateMap(): void {
    if (!this.map || !this.layer) return;

    if (this.mapLayer) {
      this.map.removeLayer(this.mapLayer);
      this.mapLayer = undefined;
    }

    if (this.layer.type === 'Feature') {
      this.addFeatureLayer();
    } else if (this.layer.type === 'Imagery') {
      this.addImageryLayer();
    } else if (this.layer.type === 'GeoPackage' && this.layer.tables) {
      this.addGeoPackageLayer();
    }

    if (this.layer.bounds && this.layer.bounds.length === 4) {
      const bounds = L.latLngBounds(
        [this.layer.bounds[1], this.layer.bounds[0]],
        [this.layer.bounds[3], this.layer.bounds[2]]
      );
      this.map.fitBounds(bounds);
    }
  }

  private addFeatureLayer(): void {
    const url = `/api/layers/${this.layer.id}/features`;

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
    if (!this.map || !this.layer.url || !this.layer.format) return;

    if (this.layer.format === 'XYZ' || this.layer.format === 'TMS') {
      const options: L.TileLayerOptions = {
        maxZoom: 18,
        tms: this.layer.format === 'TMS'
      };

      this.mapLayer = L.tileLayer(this.layer.url, options).addTo(this.map);
      return;
    }

    if (this.layer.format === 'WMS' && this.layer.wms) {
      const options: L.WMSOptions = {
        layers: this.layer.wms.layers || '',
        version: this.layer.wms.version || '1.3.0',
        format: this.layer.wms.format || 'image/png',
        transparent: this.layer.wms.transparent ?? true
      };

      if (this.layer.wms.styles) {
        options.styles = this.layer.wms.styles;
      }

      this.mapLayer = L.tileLayer.wms(this.layer.url, options).addTo(this.map);

      if (this.layer.wms.extent && this.layer.wms.extent.length === 4) {
        const bounds = L.latLngBounds(
          [this.layer.wms.extent[1], this.layer.wms.extent[0]],
          [this.layer.wms.extent[3], this.layer.wms.extent[2]]
        );
        this.map.fitBounds(bounds);
      }
    }
  }

  private addGeoPackageLayer(): void {
    if (!this.map || !this.layer.tables || this.layer.tables.length === 0)
      return;

    const accessToken = this.localStorageService.getToken();

    this.layer.tables.forEach((table) => {
      const url = `/api/layers/${this.layer!.id}/${
        table.name
      }/{z}/{x}/{y}.png?access_token=${accessToken}`;

      const tileLayer = L.tileLayer(url, { maxZoom: 18 }).addTo(this.map!);

      if (!this.mapLayer) {
        this.mapLayer = tileLayer;
      }
    });
  }

  shouldShowMap(): boolean {
    return (
      !!this.layer &&
      (this.layer.type === 'Imagery' ||
        this.layer.type === 'Feature' ||
        (this.layer.type === 'GeoPackage' && !!this.layer.tables?.length))
    );
  }
}
