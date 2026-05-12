import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeometryPipe } from './geometry.pipe';

@NgModule({
  imports: [
    CommonModule,
    GeometryPipe
  ],
  exports: [
    GeometryPipe
  ]
})
export class GeometryModule { }