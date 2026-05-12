import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerComponent } from './baner.component';

@NgModule({
  imports: [
    CommonModule,
    BannerComponent
  ],
  exports: [
    BannerComponent
  ]
})
export class BannerModule { }