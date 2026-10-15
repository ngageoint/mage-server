import { Component, booleanAttribute, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapLayerService } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';

@Component({
    selector: 'layer-header',
    templateUrl: './layer-header.component.html',
    styleUrls: ['./layer-header.component.scss'],
    standalone: true,
    imports: [
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatRadioModule,
        MatTooltipModule
    ]
})
export class LayerHeaderComponent {
  private layerService: MapLayerService = inject(MapLayerService);

  layer = input.required<RenderedMapLayer>();
  multi = input(false, { transform: booleanAttribute });

  hasBounds(): boolean {
    const layer = this.layer();
    return 'getBounds' in layer.layer || (layer.type === 'GeoPackage' && Boolean(layer.bbox));
  }

  checkChanged(event: MatCheckboxChange): void {
    this.layerService.toggle(this.layer(), event.checked);
  }

  radioChanged(): void {
    this.layerService.toggle(this.layer(), true);
  }

  zoom($event: MouseEvent): void {
    $event.stopPropagation();
    this.layerService.zoom(this.layer());
  }
}
