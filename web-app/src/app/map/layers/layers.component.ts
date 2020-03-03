import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ToggleEvent, ZoomEvent } from './layer-header.component';
import { OpacityEvent } from './layer-content.component';

export interface ReorderEvent {
  type: string;
  layers: [any],
  currentIndex: number;
  previousIndex: number;
}

@Component({
  selector: 'map-layers-panel',
  templateUrl: './layers.component.html',
  styleUrls: ['./layers.component.scss']
})
export class LayersComponent {
  @Input() mageLayers: [];
  @Input() baseLayers: [];
  @Input() tileOverlays: [];
  @Input() featureOverlays: [];
  
  @Output() onToggle = new EventEmitter<ToggleEvent>();
  @Output() onOpacity = new EventEmitter<OpacityEvent>();
  @Output() onReorder = new EventEmitter<ReorderEvent>();
  @Output() onZoom = new EventEmitter<ZoomEvent>();

  collapsed = true;

  constructor() { }

  reorderLayers(event: CdkDragDrop<string[]>, type: string, layers: [any]) {
    if (event.currentIndex === event.previousIndex) return;

    this.onReorder.emit({
      type: type,
      layers: layers,
      currentIndex: event.currentIndex,
      previousIndex: event.previousIndex
    });    
  }
}
