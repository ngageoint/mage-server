import { Component, Output, EventEmitter } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { ReorderEvent } from './layers/layers.component';
import { ToggleEvent, ZoomEvent } from './layers/layer-header.component';
import { OpacityEvent } from './layers/layer-content.component';

@Component({
  selector: 'app-leaflet',
  templateUrl: './leaflet.component.html',
  styleUrls: ['./leaflet.component.scss']
})
export class LeafletComponent {
  public static readonly PANE_Z_INDEX_BUCKET_SIZE = 10000;
  public static readonly BASE_PANE_Z_INDEX_OFFSET = 1 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly TILE_PANE_Z_INDEX_OFFSET = 2 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;
  public static readonly FEATURE_PANE_Z_INDEX_OFFSET = 6 * LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE;;

  @Output() onLayerPanelToggle = new EventEmitter<void>();
  @Output() onAddObservation = new EventEmitter<void>();

  map: any;
  groups = {};
  mageLayers = [];
  baseLayers = [];
  tileLayers = [];
  featureLayers = [];

  constructor() { 
    this.groups['base'] = {
      offset: LeafletComponent.BASE_PANE_Z_INDEX_OFFSET,
      layers: this.baseLayers
    };

    this.groups['MAGE'] = {
      offset: LeafletComponent.FEATURE_PANE_Z_INDEX_OFFSET,
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
  }

  onMapAvailable($event: any) {
    this.map = $event.map;
  }

  addLayer($event: any) {
    const group = this.groups[$event.group];
    $event.zIndex = group.offset + LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE - (group.layers.length + 1);
    $event.layer.pane.style.zIndex = $event.zIndex;
    group.layers.push($event);
  }

  removeLayer($event: any) {
    console.log('remove layer', $event);
    // const id = L.stamp($event.layer);
    // delete this.baseLayers[id];
    // delete this.overlayLayers[id];
  }

  layerTogged($event: ToggleEvent) {
    if ($event.layer.base) {
      this.baseToggled($event);
    } else {
      this.overlayToggled($event);
    }
  }

  baseToggled($event: ToggleEvent) {
    const previousBaseLayer = this.baseLayers.find((layer: any) => layer.selected);
    previousBaseLayer.selected = false;
    this.map.removeLayer(previousBaseLayer.layer);

    $event.layer.selected = true;
    this.map.addLayer($event.layer.layer);
  }

  overlayToggled($event: ToggleEvent) {
    if ($event.value) {
      this.map.addLayer($event.layer.layer);
    } else {
      this.map.removeLayer($event.layer.layer);
    }
  }

  opacityChanged($event: OpacityEvent) {
    $event.layer.layer.pane.style.opacity = $event.value;
  }

  zoom($event: ZoomEvent) {
    if ($event.layer.layer.getBounds) {
      const bounds = $event.layer.layer.getBounds();
      this.map.fitBounds(bounds);
    } else if ($event.layer.bbox) {
      this.map.fitBounds([
        [$event.layer.bbox[0], $event.layer.bbox[1]],
        [$event.layer.bbox[2], $event.layer.bbox[3]]
      ]);
    }
  }

  reorder($event: ReorderEvent) {
    moveItemInArray($event.layers, $event.previousIndex, $event.currentIndex);
    const offset = $event.type === 'feature' ? LeafletComponent.FEATURE_PANE_Z_INDEX_OFFSET : LeafletComponent.TILE_PANE_Z_INDEX_OFFSET;
    $event.layers.forEach((layer: any, index: number) => {
      layer.zIndex = offset + LeafletComponent.PANE_Z_INDEX_BUCKET_SIZE - (index + 1);
      layer.layer.pane.style.zIndex = layer.zIndex;
    });
  }

}
