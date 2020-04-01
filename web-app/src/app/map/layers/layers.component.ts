import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

export interface ReorderEvent {
  type: string;
  layers: [any];
  currentIndex: number;
  previousIndex: number;
}

@Component({
  selector: 'map-layers-panel',
  templateUrl: './layers.component.html',
  styleUrls: ['./layers.component.scss']
})
export class LayersComponent {
  @Input() mageLayers: [any];
  @Input() baseLayers: [any];
  @Input() tileOverlays: [any];
  @Input() featureOverlays: [any];

  @Output() onReorder = new EventEmitter<ReorderEvent>();

  collapsed = true;

  reorderLayers(event: CdkDragDrop<string[]>, type: string, layers: [any]): void {
    if (event.currentIndex === event.previousIndex) return;

    this.onReorder.emit({
      type: type,
      layers: layers,
      currentIndex: event.currentIndex,
      previousIndex: event.previousIndex
    });
  }

  preventHeaderToggle(event: any, panel: any): void {
    event.stopPropagation();
    panel.toggle();
  }
}
