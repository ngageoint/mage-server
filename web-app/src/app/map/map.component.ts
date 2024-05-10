import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ReorderEvent } from './layers/layers.component';
import { LayerService, ToggleEvent, ZoomEvent, OpacityEvent, StyleEvent } from './layers/layer.service';
import { MapService } from './map.service';
import { map, latLng, tileLayer, MapOptions, LatLng } from "leaflet";

@Component({
  selector: 'map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  providers: [LayerService]
})
export class MapComponent implements OnInit {
  public static readonly PANE_Z_INDEX_BUCKET_SIZE = 10000;
  public static readonly BASE_PANE_Z_INDEX_OFFSET = 1 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly TILE_PANE_Z_INDEX_OFFSET = 2 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly GRID_PANE_Z_INDEX_OFFSET = 3 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly FEATURE_PANE_Z_INDEX_OFFSET = 6 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly MAGE_PANE_Z_INDEX_OFFSET = 7 * MapComponent.PANE_Z_INDEX_BUCKET_SIZE;

  @Output() onLayerPanelToggle = new EventEmitter<void>();
  @Output() onAddObservation = new EventEmitter<void>();

  map: any;
  groups = {};

  constructor(
    layerServive: LayerService,
    private mapService: MapService
  ) {
    this.groups['base'] = {
      offset: MapComponent.BASE_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    this.groups['MAGE'] = {
      offset: MapComponent.MAGE_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    this.groups['feed'] = {
      offset: MapComponent.MAGE_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    this.groups['tile'] = {
      offset: MapComponent.TILE_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    this.groups['feature'] = {
      offset: MapComponent.FEATURE_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    this.groups['grid'] = {
      offset: MapComponent.GRID_PANE_Z_INDEX_OFFSET,
      layers: []
    };

    layerServive.toggle$.subscribe(event => this.layerTogged(event));
    layerServive.zoom$.subscribe(event => this.zoom(event));
    layerServive.opacity$.subscribe(event => this.opacityChanged(event));
    layerServive.style$.subscribe(event => this.styleChanged(event));
  }

  ngOnInit(): void {
    this.map = map('map', {
      center: new LatLng(0.0, 0.0),
      zoom: 3,
      zoomControl: false,
      minZoom: 0,
      maxZoom: 18,
      trackResize: true,
      worldCopyJump: true,
      // editable: true // turn on Leaflet.Editable
    });

    tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.map);
  }

  onMapAvailable($event: any): void {
    this.map = $event.map;
  }

  addLayer($event: any): void {
    if (this.isSelected($event)) {
      $event.selected = true;
      const toggleEvent: ToggleEvent = {
        layer: $event,
        value: true
      }
      this.layerTogged(toggleEvent);
    }

    const groupName = this.getGroup($event);
    const group = this.groups[groupName];
    $event.zIndex = group.offset + MapComponent.PANE_Z_INDEX_BUCKET_SIZE - (group.layers.length + 1);
    const pane = this.map.getPanes()[$event.layer.pane];
    pane.style.zIndex = $event.zIndex;
    group.layers.push($event);
  }

  removeLayer($event: any): void {
    Object.values(this.groups).forEach((group: any) => {
      group.layers = group.layers.filter(layer => {
        return layer.layer !== $event.layer.layer;
      });
    });
  }

  layerTogged(event: ToggleEvent): void {
    if (event.layer.base) {
      this.baseToggled(event);
    } else {
      this.overlayToggled(event);
    }
  }

  baseToggled(event: ToggleEvent): void {
    const baseLayers = this.groups['base'].layers;
    const previousBaseLayer = baseLayers.find((layer: any) => layer.selected);
    if (previousBaseLayer) {
      previousBaseLayer.selected = false;
      this.map.removeLayer(previousBaseLayer.layer);
    }

    event.layer.selected = true;
    this.map.addLayer(event.layer.layer);

    this.mapService.selectBaseLayer(event.layer)
  }

  overlayToggled(event: ToggleEvent): void {
    if (event.value) {
      this.map.addLayer(event.layer.layer);
    } else {
      this.map.removeLayer(event.layer.layer);
    }
  }

  opacityChanged(event: OpacityEvent): void {
    const pane = this.map.getPanes()[event.layer.layer.pane];
    pane.style.opacity = event.opacity;
    if (event.layer.layer.setOpacity) {
      event.layer.layer.setOpacity(event.opacity);
    }
  }

  zoom($event: ZoomEvent): void {
    const layer = $event.layer.layer;
    if (layer.getBounds) {
      const bounds = layer.getBounds();
      this.map.fitBounds(bounds);
    } else if (layer.table && layer.table.bbox) {
      this.map.fitBounds([
        [layer.table.bbox[1], layer.table.bbox[0]],
        [layer.table.bbox[3], layer.table.bbox[2]]
      ]);
    }
  }

  styleChanged(event: StyleEvent): void {
    event.layer.layer.setStyle(event.style);
  }

  reorder($event: ReorderEvent): void {
    moveItemInArray($event.layers, $event.previousIndex, $event.currentIndex);
    const offset =
      $event.type === 'feature'
        ? MapComponent.FEATURE_PANE_Z_INDEX_OFFSET
        : MapComponent.TILE_PANE_Z_INDEX_OFFSET;

    $event.layers.forEach((layer: any, index: number) => {
      layer.zIndex = offset + MapComponent.PANE_Z_INDEX_BUCKET_SIZE - (index + 1);
      const pane = this.map.getPanes()[layer.layer.pane];
      pane.style.zIndex = layer.zIndex;
    });
  }

  private getGroup(layer): string {
    switch (layer.type) {
      case 'GeoPackage':
        return layer.layer.table.type === 'tile' ? 'tile' : 'feature';
      case 'Imagery':
        return layer.base ? 'base' : 'tile';
      case 'geojson':
        return layer.group;
      case 'grid': 
        return layer.group;
    }
  }

  private isSelected(layer): boolean {
    return layer.options && layer.options.selected;
  }
}
