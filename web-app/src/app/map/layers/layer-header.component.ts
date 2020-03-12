import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCheckboxChange, MatRadioChange } from '@angular/material';
import { LayerService } from './layer.service';
import { state, transition, animate, style, trigger } from '@angular/animations';

@Component({
  selector: 'layer-header',
  templateUrl: './layer-header.component.html',
  styleUrls: ['./layer-header.component.scss'],
  animations: [
    trigger('expanded', [
      state('true', style({ transform: 'rotate(0)' })),
      state('false', style({ transform: 'rotate(90deg)' })),
      transition('* <=> *', animate('250ms ease-out'))
    ])
  ]
})
export class LayerHeaderComponent {
  @Input() layer: any;
  @Input() multi: boolean;
  @Output() onToggle = new EventEmitter<void>();

  expanded = false;
  
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

  toggle(): void {
    setTimeout(() => {
      this.expanded = !this.expanded;
    });

    this.onToggle.emit();
  }
}
