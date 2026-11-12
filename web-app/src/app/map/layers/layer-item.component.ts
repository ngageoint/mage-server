import { Component, booleanAttribute, input, signal } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RenderedMapLayer } from '../entities.map-layer';
import { LayerHeaderComponent } from './layer-header.component';
import { LayerContentComponent } from './layer-content.component';

@Component({
    selector: 'layer-item',
    templateUrl: './layer-item.component.html',
    styleUrls: ['./layer-item.component.scss'],
    imports: [
        DragDropModule,
        MatButtonModule,
        MatIconModule,
        LayerHeaderComponent,
        LayerContentComponent
    ],
    host: {
        role: 'listitem'
    }
})
export class LayerItemComponent {
  layer = input.required<RenderedMapLayer>();
  multi = input(false, { transform: booleanAttribute });
  reorderable = input(false, { transform: booleanAttribute });

  expanded = signal(false);

  toggle(): void {
    this.expanded.update(expanded => !expanded);
  }
}
