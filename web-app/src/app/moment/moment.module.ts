import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MomentPipe } from './moment.pipe';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    MomentPipe
  ],
  exports: [
    MomentPipe
  ],
  providers: [
    MomentPipe
  ],
})
export class MomentModule { }
