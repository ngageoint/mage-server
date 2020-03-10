import { Component, Input } from '@angular/core';
import { MatCheckboxChange, MatRadioChange } from '@angular/material';
import { LayerService } from './layer.service';

@Component({
  selector: 'layer-header',
  templateUrl: './layer-header.component.html',
  styleUrls: ['./layer-header.component.scss']
})
export class LayerHeaderComponent {
  @Input() layer: any;
  @Input() multi: boolean;

  constructor(private layerService: LayerService) {}

  hasBounds(layer: any): boolean {
    const mapLayer = layer.layer;
    return mapLayer.getBounds || (mapLayer.table && mapLayer.table.bbox);
  }

  checkChanged(event: MatCheckboxChange, layer: any): void {
    this.layerService.toggle(layer, event.checked);
  }

  radioChanged(event: MatRadioChange, layer: any): void {
    this.layerService.toggle(layer, event.value);
  }

  zoom($event: MouseEvent, layer: any): void {
    $event.stopPropagation();
    this.layerService.zoom(layer);
  }
}
