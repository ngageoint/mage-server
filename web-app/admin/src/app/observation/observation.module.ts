import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Material Modules
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { InputMaskModule } from '@ngneat/input-mask';

// Geometry Module
import { GeometryModule } from '../geometry/geometry.module';
import { MomentModule } from '../moment/moment.module';
import { MapClipComponent } from '../map/clip/clip.component';

// Observation Components
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
    declarations: [
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
        MomentModule
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
export class ObservationModule { }
