import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MomentPipe } from './moment.pipe';

@NgModule({
  imports: [
    CommonModule,
    MomentPipe
  ],
  exports: [
    MomentPipe
  ]
})
export class MomentModule { }