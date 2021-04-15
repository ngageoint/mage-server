import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { LayerService } from './layer.service';
import { state, style, trigger } from '@angular/animations';

@Component({
  selector: 'layer-header',
  templateUrl: './layer-header.component.html',
  styleUrls: ['./layer-header.component.scss'],
  animations: [
    trigger('expanded', [
      state('true', style({ transform: 'rotate(0)' })),
      state('false', style({ transform: 'rotate(90deg)' }))
    ])
  ]
})
export class LayerHeaderComponent {
  @Input() layer: any;
  @Input() multi: boolean;
  @Output() onToggle = new EventEmitter<void>();

  expanded = false;
  
  constructor(private layerService: LayerService) {}

  hasBounds(): boolean {
    const mapLayer = this.layer.layer;
    return mapLayer.getBounds || (mapLayer.table && mapLayer.table.bbox);
  }

  checkChanged(event: MatCheckboxChange): void {
    this.layerService.toggle(this.layer, event.checked);
  }

  radioChanged(): void {
    this.layerService.toggle(this.layer, true);
  }

  zoom($event: MouseEvent): void {
    $event.stopPropagation();
    this.layerService.zoom(this.layer);
  }

  toggle(): void {
    this.expanded = !this.expanded;
    this.onToggle.emit();
  }
}
