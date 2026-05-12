import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { InputMaskModule } from '@ngneat/input-mask';

import { GeometryModule } from '../geometry/geometry.module';
import { MomentModule } from '../moment/moment.module';
import { MapClipComponent } from '../map/clip/clip.component';

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
  ObservationEditComponent
} from './observation-edit/observation-edit';

import { ObservationEditFormPickerComponent } from './observation-edit/observation-edit-form-picker.component';
import { ObservationEditAttachmentComponent } from './observation-edit/observation-edit-attachment/observation-edit-attachment.component';
import { ObservationEditPasswordComponent } from './observation-edit/observation-edit-password/observation-edit-password.component';
import { ObservationEditDiscardComponent } from './observation-edit/observation-edit-discard/observation-edit-discard.component';
import { AttachmentComponent } from './attachment/attachment.component';
import { AttachUploadComponent } from './attachment/attachment-upload/attachment-upload.component';
import { FilenamePipe } from '../filename/filename.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    MatAutocompleteModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSliderModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatToolbarModule,
    NgxMatSelectSearchModule,
    InputMaskModule,
    GeometryModule,
    MomentModule,

    ObservationEditComponent,
    ObservationEditAttachmentComponent,
    ObservationEditFormComponent,
    ObservationEditFormPickerComponent,
    ObservationEditMultiselectComponent,
    ObservationEditCheckboxComponent,
    ObservationEditSelectComponent,
    ObservationEditEmailComponent,
    ObservationEditNumberComponent,
    ObservationEditTextComponent,
    ObservationEditTextareaComponent,
    ObservationEditRadioComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryMapComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditDateComponent,
    ObservationEditPasswordComponent,
    ObservationEditDiscardComponent,
    MapClipComponent,
    AttachmentComponent,
    AttachUploadComponent,
    FilenamePipe
  ],
  exports: [
    ObservationEditComponent,
    ObservationEditAttachmentComponent,
    ObservationEditFormComponent,
    ObservationEditFormPickerComponent,
    ObservationEditMultiselectComponent,
    ObservationEditCheckboxComponent,
    ObservationEditSelectComponent,
    ObservationEditEmailComponent,
    ObservationEditNumberComponent,
    ObservationEditTextComponent,
    ObservationEditTextareaComponent,
    ObservationEditRadioComponent,
    ObservationEditGeometryComponent,
    ObservationEditGeometryMapComponent,
    ObservationEditGeometryFormComponent,
    ObservationEditDateComponent,
    ObservationEditPasswordComponent,
    ObservationEditDiscardComponent,
    MapClipComponent,
    AttachmentComponent,
    AttachUploadComponent,
    FilenamePipe
  ]
})
export class ObservationModule {}
