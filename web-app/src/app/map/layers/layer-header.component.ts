import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MatCheckboxChange, MatRadioChange } from '@angular/material';

export interface ToggleEvent {
  layer: any,
  value: (boolean | number);
}

export interface ZoomEvent {
  layer: any
}

@Component({
  selector: 'layer-header',
  templateUrl: './layer-header.component.html',
  styleUrls: ['./layer-header.component.scss']
})
export class LayerHeaderComponent implements OnInit {
  @Input() layer: any;
  @Input() multi: boolean;

  @Output() onToggle = new EventEmitter<ToggleEvent>();
  @Output() onZoom = new EventEmitter<ZoomEvent>();

  constructor() { }

  ngOnInit() {
  }

  checkChanged(event: MatCheckboxChange, layer: any) {
    this.onToggle.emit({
      layer: layer,
      value: event.checked
    });
  }

  radioChanged(event: MatRadioChange, layer: any) {
    this.onToggle.emit({
      layer: layer,
      value: event.value
    });
  }

  zoom($event: MouseEvent, layer: any) {
    $event.stopPropagation();
    this.onZoom.emit({
      layer: layer
    })
  }

}
