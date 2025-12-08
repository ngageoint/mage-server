import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview/admin-event-form-preview-dialog.component';
import { ObservationModule } from '../../../observation/observation.module';

@NgModule({
    declarations: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        ObservationModule
    ],
    exports: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent
    ]
})
export class AdminEventFormModule { }
