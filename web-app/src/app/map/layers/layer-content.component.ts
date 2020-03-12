import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { MatSliderChange } from '@angular/material';
import { LayerService, SimpleStyle } from './layer.service';
import { ColorEvent } from 'src/app/color-picker/color-picker.component';

@Component({
  selector: 'layer-content',
  templateUrl: './layer-content.component.html',
  styleUrls: ['./layer-content.component.scss']
})
export class LayerContentComponent {
  @Input() layer: any;
  @Input() style: SimpleStyle;

  @ViewChild('color', { static: false }) color: ElementRef;

  showColorPicker = false;
  stroke = '#000000';

  constructor(private layerService: LayerService) {}

  toggleStyle(): void {
    if (this.style) {
      this.style = null;
    } else {
      this.style = {
        stroke: "#FF0000FF",
        fill: "#00FF0011",
        width: 1
      }
    }

    this.layerService.style(this.layer, this.style);
  }

  opacityChanged(event: MatSliderChange, layer: any): void {
    this.layerService.opacity(layer, event.value / 100);
  }

  colorChanged(event: ColorEvent, key: string): void {
    this.layerService.style(this.layer, {
      [key]: event.color
    });
  }

  widthChanged(width: any): void {
    this.layerService.style(this.layer, {
      width: width
    });
  }

  formatOpacity(opacity: number): string {
    return opacity + '%';
  }
}