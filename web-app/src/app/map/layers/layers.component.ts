import { Component, input, output } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatExpansionModule } from '@angular/material/expansion';
import { RenderedMapLayer } from '../entities.map-layer';
import { LayerHeaderComponent } from './layer-header.component';
import { LayerContentComponent } from './layer-content.component';

export interface ReorderEvent {
  group: 'mage' | 'feed' | 'feature' | 'tile';
  layers: RenderedMapLayer[];
  currentIndex: number;
  previousIndex: number;
}

@Component({
    selector: 'map-layers-panel',
    templateUrl: './layers.component.html',
    styleUrls: ['./layers.component.scss'],
    standalone: true,
    imports: [
        DragDropModule,
        MatExpansionModule,
        LayerHeaderComponent,
        LayerContentComponent
    ]
})
export class LayersComponent {
  mageLayers = input<RenderedMapLayer[]>([]);
  feedLayers = input<RenderedMapLayer[]>([]);
  baseLayers = input<RenderedMapLayer[]>([]);
  tileOverlays = input<RenderedMapLayer[]>([]);
  featureOverlays = input<RenderedMapLayer[]>([]);
  gridOverlays = input<RenderedMapLayer[]>([]);

  onReorder = output<ReorderEvent>();

  reorderLayers(event: CdkDragDrop<RenderedMapLayer[]>, group: ReorderEvent['group'], layers: RenderedMapLayer[]): void {
    if (event.currentIndex === event.previousIndex) return;

    this.onReorder.emit({
      group: group,
      layers: layers,
      currentIndex: event.currentIndex,
      previousIndex: event.previousIndex
    });
  }
}
