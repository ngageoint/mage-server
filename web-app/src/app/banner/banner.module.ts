import { NgModule } from '@angular/core';
import { BannerComponet } from './baner.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    BannerComponet,
  ],
  imports: [CommonModule],
  exports: [BannerComponet]
})
export class BannerModule { }