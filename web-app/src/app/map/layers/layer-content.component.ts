import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import { LayerService, SimpleStyle } from './layer.service';
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'layer-content',
  templateUrl: './layer-content.component.html',
  styleUrls: ['./layer-content.component.scss'],
  animations: [
    trigger('visibility', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('225ms', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('225ms', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class LayerContentComponent {
  @Input() layer: any;
  @Input() style: SimpleStyle;

  @ViewChild('color') color: ElementRef;

  showColorPicker = false;
  stroke = '#000000';

  constructor(private layerService: LayerService) {}

  toggleStyle(): void {
    if (this.style) {
      this.style = null;
    } else {
      this.style = {
        stroke: "#000000FF",
        fill: "#00000011",
        width: 1
      }
    }

    this.layerService.style(this.layer, this.style);
  }

  opacityChanged(event: MatSliderChange): void {
    this.layerService.opacity(this.layer, event.value / 100);
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