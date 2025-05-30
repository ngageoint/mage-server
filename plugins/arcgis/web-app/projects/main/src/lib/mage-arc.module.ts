import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatDialogModule } from '@angular/material/dialog'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatListModule } from '@angular/material/list'
import { MatSelectModule } from '@angular/material/select'
import { MatTableModule } from '@angular/material/table'
import { ArcAdminComponent } from './arc-admin/arc-admin.component'
import { HttpClientModule } from '@angular/common/http'
import { MageUserModule } from '@ngageoint/mage.web-core-lib/user'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ArcLayerComponent } from './arc-layer/arc-layer.component';
import { ArcEventComponent } from './arc-event/arc-event.component';
import { ArcLayerDialogComponent } from './arc-layer/arc-layer-dialog.component';
import { ArcLayerDeleteDialogComponent } from './arc-layer/arc-layer-delete-dialog.component';

@NgModule({
  declarations: [
    ArcEventComponent,
    ArcLayerComponent,
    ArcLayerDialogComponent,
    ArcLayerDeleteDialogComponent,
    ArcAdminComponent
  ],
  imports: [
    MageUserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatTableModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  exports: [
    ArcAdminComponent,
    ArcLayerComponent,
    ArcEventComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class MageArcModule { }
