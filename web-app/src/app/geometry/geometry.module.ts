import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeometryPipe } from './geometry.pipe';

@NgModule({
  declarations: [
    GeometryPipe
  ],
  exports: [
    GeometryPipe
  ],
  imports: [
    CommonModule
  ]
})
export class GeometryModule { }