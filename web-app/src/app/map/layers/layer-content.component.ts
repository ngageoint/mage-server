import { Component, Input, ViewChild, ElementRef, OnInit } from '@angular/core';
import { MatSliderChange } from '@angular/material';
import { LayerService, SimpleStyle } from './layer.service';
import { ColorEvent } from 'src/app/color-picker/color-picker.component';

@Component({
  selector: 'layer-content',
  templateUrl: './layer-content.component.html',
  styleUrls: ['./layer-content.component.scss']
})
export class LayerContentComponent implements OnInit {
  @Input() layer: any;
  @Input() style: SimpleStyle;

  @ViewChild('color', { static: false }) color: ElementRef;

  showColorPicker = false;
  stroke = '#000000';

  constructor(private layerService: LayerService) {}

  ngOnInit(): void {
    if (!this.style) {
      this.style = {
        stroke: "#000000FF",
        fill: "#00000011",
        width: 1
      }
    }
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