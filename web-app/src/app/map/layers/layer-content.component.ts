import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MapLayerService, SimpleStyle } from './layer.service';
import { RenderedMapLayer } from '../entities.map-layer';
import { ColorEvent } from 'src/app/color-picker/color-picker.component';
import { ColorPickerModule } from 'src/app/color-picker/color-picker.module';

const DEFAULT_STYLE: SimpleStyle = {
  stroke: '#000000FF',
  fill: '#00000011',
  width: 2
};

@Component({
    selector: 'layer-content',
    templateUrl: './layer-content.component.html',
    styleUrls: ['./layer-content.component.scss'],
    standalone: true,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSlideToggleModule,
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

  opacity = signal(100);
  override = signal(false);
  style = signal<SimpleStyle>(DEFAULT_STYLE);

  overrideChanged(override: boolean): void {
    this.override.set(override);
    this.layerService.style(this.layer(), override ? this.style() : null);
  }

  opacityChanged(value: number): void {
    this.opacity.set(value);
    this.layerService.opacity(this.layer(), value / 100);
  }

  colorChanged(event: ColorEvent, key: string): void {
    this.styleChanged({ [key]: event.color });
  }

  widthChanged(width: number | null): void {
    if (width !== null) {
      this.styleChanged({ width: width });
    }
  }

  private styleChanged(style: SimpleStyle): void {
    this.style.update(current => ({ ...current, ...style }));
    this.layerService.style(this.layer(), this.style());
  }

  formatOpacity(opacity: number): string {
    return opacity + '%';
  }
}
