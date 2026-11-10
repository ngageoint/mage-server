import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatTimepickerModule } from '@angular/material/timepicker';

import { InputMaskModule } from '@ngneat/input-mask';
import { GeometryModule } from '../../geometry/geometry.module';
import { MapClipModule } from '../../map/clip/map-clip.module';
import {
  ObservationEditCheckboxComponent,
  ObservationEditDateComponent,
  ObservationEditSelectComponent,
  ObservationEditEmailComponent,
  ObservationEditGeometryComponent,
  ObservationEditGeometryFormComponent,
  ObservationEditGeometryMapComponent,
  ObservationEditMultiselectComponent,
  ObservationEditNumberComponent,
  ObservationEditRadioComponent,
  ObservationEditTextComponent,
  ObservationEditTextareaComponent,
  ObservationEditFormComponent,
} from './observation-edit';
import { ObservationEditAttachmentComponent } from './observation-edit-attachment/observation-edit-attachment.component';
import { ObservationEditPasswordComponent } from './observation-edit-password/observation-edit-password.component';

@NgModule({
  declarations: [
    ObservationEditFormComponent,
    ObservationEditDateComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditGeometryMapComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ObservationEditAttachmentComponent,
    ObservationEditCheckboxComponent,
    ObservationEditEmailComponent,
    ObservationEditMultiselectComponent,
    ObservationEditNumberComponent,
    ObservationEditPasswordComponent,
    ObservationEditRadioComponent,
    ObservationEditSelectComponent,
    ObservationEditTextComponent,
    ObservationEditTextareaComponent,
    GeometryModule,
    InputMaskModule.forRoot(),
    MapClipModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMomentDateModule,
    MatTimepickerModule,
  ],
  exports: [
    ObservationEditFormComponent,
    ObservationEditAttachmentComponent,
    ObservationEditCheckboxComponent,
    ObservationEditDateComponent,
    ObservationEditSelectComponent,
    ObservationEditEmailComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditGeometryMapComponent,
    ObservationEditMultiselectComponent,
    ObservationEditNumberComponent,
    ObservationEditPasswordComponent,
    ObservationEditRadioComponent,
    ObservationEditTextComponent,
    ObservationEditTextareaComponent,
  ]
})
export class ObservationEditModule {}
