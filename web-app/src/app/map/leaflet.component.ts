import { Component, Output, EventEmitter } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ReorderEvent } from './layers/layers.component';
import { LayerService, ToggleEvent, ZoomEvent, OpacityEvent, StyleEvent } from './layers/layer.service';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.scss'],
  providers: [LayerService]
})
export class LeafletComponent {
  public static readonly PANE_Z_INDEX_BUCKET_SIZE = 10000;
  public static readonly BASE_PANE_Z_INDEX_OFFSET = 1 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly TILE_PANE_Z_INDEX_OFFSET = 2 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly FEATURE_PANE_Z_INDEX_OFFSET = 6 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly MAGE_PANE_Z_INDEX_OFFSET = 7 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;

  @Output() onLayerPanelToggle = new EventEmitter<void>();
  @Output() onAddObservation = new EventEmitter<void>();

  map: any;
  groups = {};
  mageLayers = [];
  baseLayers = [];
  tileLayers = [];
  featureLayers = [];

  constructor(layerServive: LayerService) {
    this.groups['base'] = {
      offset: LeafletComponent.BASE_PANE_Z_INDEX_OFFSET,
      layers: this.baseLayers
    };

    this.groups['MAGE'] = {
      offset: LeafletComponent.MAGE_PANE_Z_INDEX_OFFSET,
      layers: this.mageLayers
    };

    this.groups['tile'] = {
      offset: LeafletComponent.TILE_PANE_Z_INDEX_OFFSET,
      layers: this.tileLayers
    };

    this.groups['feature'] = {
      offset: LeafletComponent.FEATURE_PANE_Z_INDEX_OFFSET,
      layers: this.featureLayers
    };

    layerServive.toggle$.subscribe(event => this.layerTogged(event));
    layerServive.zoom$.subscribe(event => this.zoom(event));
    layerServive.opacity$.subscribe(event => this.opacityChanged(event));
    layerServive.style$.subscribe(event => this.styleChanged(event));
  }

  onMapAvailable($event: any): void {
    this.map = $event.map;
  }

  addLayer($event: any): void {
    const group = this.groups[$event.group];
    $event.zIndex = group.offset + LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE - (group.layers.length + 1);
    $event.layer.pane.style.zIndex = $event.zIndex;
    group.layers.push($event);
  }

  layerTogged(event: ToggleEvent): void {
    if (event.layer.base) {
      this.baseToggled(event);
    } else {
      this.overlayToggled(event);
    }
  }

  baseToggled(event: ToggleEvent): void {
    const previousBaseLayer = this.baseLayers.find((layer: any) => layer.selected);
    previousBaseLayer.selected = false;
    this.map.removeLayer(previousBaseLayer.layer);

    event.layer.selected = true;
    this.map.addLayer(event.layer.layer);
  }

  overlayToggled(event: ToggleEvent): void {
    if (event.value) {
      this.map.addLayer(event.layer.layer);
    } else {
      this.map.removeLayer(event.layer.layer);
    }
  }

  opacityChanged(event: OpacityEvent): void {
    event.layer.layer.pane.style.opacity = event.opacity;
  }

  zoom($event: ZoomEvent): void {
    const layer = $event.layer.layer;
    if (layer.getBounds) {
      const bounds = layer.getBounds();
      this.map.fitBounds(bounds);
    } else if (layer.table && layer.table.bbox) {
      this.map.fitBounds([
        [layer.table.bbox[0], layer.table.bbox[1]],
        [layer.table.bbox[2], layer.table.bbox[3]]
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
        ? LeafletComponent.FEATURE_PANE_Z_INDEX_OFFSET
        : LeafletComponent.TILE_PANE_Z_INDEX_OFFSET;

    $event.layers.forEach((layer: any, index: number) => {
      layer.zIndex = offset + LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE - (index + 1);
      layer.layer.pane.style.zIndex = layer.zIndex;
    });
  }
}
