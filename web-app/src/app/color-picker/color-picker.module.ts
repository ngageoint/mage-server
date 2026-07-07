import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { SaturationModule, HueModule, AlphaModule, CheckboardModule } from 'ngx-color';

import { ColorPickerComponent } from './color-picker.component';

@NgModule({
  declarations: [ColorPickerComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    OverlayModule,
    PortalModule,
    SaturationModule,
    HueModule,
    AlphaModule,
    CheckboardModule
  ],
  exports: [ColorPickerComponent]
})
export class ColorPickerModule {}
