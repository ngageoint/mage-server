import { NgModule } from '@angular/core'
import { BrowserModule } from '@angular/platform-browser'
import { XhrImgComponent } from './xhr-img.component'

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    XhrImgComponent
  ],
  exports: [
    XhrImgComponent
  ]
})
export class MageCommonModule {}