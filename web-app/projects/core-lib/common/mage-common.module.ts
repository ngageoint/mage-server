import { NgModule } from '@angular/core'
import { XhrImgComponent } from './xhr-img.component'
import { CommonModule } from '@angular/common'

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    XhrImgComponent
  ],
  exports: [
    XhrImgComponent
  ]
})
export class MageCommonModule {}