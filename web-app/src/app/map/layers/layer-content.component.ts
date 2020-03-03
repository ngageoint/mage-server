import { Component, Input, EventEmitter, Output } from '@angular/core';
import { MatSliderChange } from '@angular/material';

export interface OpacityEvent {
  layer: any,
  value: number;
}

@Component({
  selector: 'layer-content',
  templateUrl: './layer-content.component.html',
  styleUrls: ['./layer-content.component.scss']
})
export class LayerContentComponent {
  @Input() layer: any;

  @Output() onOpacity = new EventEmitter<OpacityEvent>();

  constructor() { }

  opacityChanged(event: MatSliderChange, layer: any) {
    this.onOpacity.emit({
      layer: layer,
      value: event.value / 100
    });
  }

  formatOpacity(opacity: number) {
    return opacity + "%";
  }

}
