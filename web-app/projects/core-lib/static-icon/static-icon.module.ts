import { ScrollingModule } from '@angular/cdk/scrolling'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatCardModule as MatCardModule } from '@angular/material/card'
import { MageCommonModule } from '@ngageoint/mage.web-core-lib/common'
import { StaticIconFormFieldComponent } from './static-icon-form-field/static-icon-form-field.component'
import { StaticIconImgComponent } from './static-icon-img/static-icon-img.component'
import { StaticIconSelectComponent } from './static-icon-select/static-icon-select.component'
import { MatButtonModule } from '@angular/material/button'


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MageCommonModule,
    ScrollingModule
  ],
  declarations: [
    StaticIconFormFieldComponent,
    StaticIconImgComponent,
    StaticIconSelectComponent,
  ],
  exports: [
    StaticIconFormFieldComponent,
    StaticIconImgComponent,
    StaticIconSelectComponent,
  ]
})
export class StaticIconModule {}