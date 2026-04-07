import { ScrollingModule } from '@angular/cdk/scrolling'
import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatAutocompleteModule as MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule as MatInputModule } from '@angular/material/input'
import { MatListModule as MatListModule } from '@angular/material/list'
import { MatSelectModule as MatSelectModule } from '@angular/material/select'
import { UserSelectComponent } from './user-select/user-select.component'
import { NgSelectModule } from '@ng-select/ng-select'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    NgSelectModule,
  ],
  declarations: [
    UserSelectComponent
  ],
  exports: [
    UserSelectComponent
  ]
})
export class MageUserModule {

}