import { Component, booleanAttribute, inject, input } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MapLayerService } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';

@Component({
    selector: 'layer-header',
    templateUrl: './layer-header.component.html',
    styleUrls: ['./layer-header.component.scss'],
    imports: [
        MatCheckboxModule,
        MatRadioModule
    ]
})
export class LayerHeaderComponent {
  private layerService: MapLayerService = inject(MapLayerService);

  layer = input.required<RenderedMapLayer>();
  multi = input(false, { transform: booleanAttribute });

  checkChanged(event: MatCheckboxChange): void {
    this.layerService.toggle(this.layer(), event.checked);
  }

  radioChanged(): void {
    this.layerService.toggle(this.layer(), true);
  }
}
