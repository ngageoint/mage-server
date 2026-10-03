import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MapLayerService, SimpleStyle } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { ColorPickerModule } from 'src/app/color-picker/color-picker.module';

@Component({
    selector: 'layer-content',
    templateUrl: './layer-content.component.html',
    styleUrls: ['./layer-content.component.scss'],
    standalone: true,
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSliderModule,
        ColorPickerModule
    ]
})
export class LayerContentComponent {
  private layerService: MapLayerService = inject(MapLayerService);

  layer = input.required<RenderedMapLayer>();

  canOverrideStyle = computed(() => {
    const layer = this.layer();
    return layer.type === 'GeoPackage' && layer.renderAs === 'feature';
  });

  style = signal<SimpleStyle | null>(null);

  toggleStyle(): void {
    this.style.set(this.style() ? null : {
      stroke: '#000000FF',
      fill: '#00000011',
      width: 1
    });

    this.layerService.style(this.layer(), this.style());
  }

  opacityChanged(value: number): void {
    this.layerService.opacity(this.layer(), value / 100);
  }

  colorChanged(event: ColorEvent, key: string): void {
    this.layerService.style(this.layer(), {
      [key]: event.color
    });
  }

  widthChanged(width: number): void {
    this.layerService.style(this.layer(), {
      width: width
    });
  }

  formatOpacity(opacity: number): string {
    return opacity + '%';
  }
}
