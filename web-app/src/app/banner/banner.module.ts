import { NgModule } from '@angular/core';
import { BannerComponent } from './baner.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    BannerComponent,
  ],
  imports: [CommonModule],
  exports: [BannerComponent]
})
export class BannerModule { }