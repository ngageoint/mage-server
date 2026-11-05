import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapClipComponent } from './clip.component';

@NgModule({
  imports: [CommonModule, MapClipComponent],
  exports: [MapClipComponent]
})
export class MapClipModule {}
