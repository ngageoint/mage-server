import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatDialogModule as MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule as MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule as MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule as MatTabsModule } from '@angular/material/tabs';
import { MatCardModule as MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule as MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule as MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule as MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { ObservationEditModule } from '../../../observation/observation-edit/observation-edit.module';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview/form-preview-dialog/admin-event-form-preview-dialog.component';
import { FormDetailsComponent } from './form-details/form-details.component';
import { FieldDialogComponent } from './form-details/field-dialog/field-dialog.component';
import { SymbologyDialogComponent } from './form-details/symbology-dialog/symbology-dialog.component';
import { EditFormDialogComponent } from './form-details/edit-form-dialog/edit-form-dialog.component';
import { FieldsListComponent } from './fields-list/fields-list.component';
import { AdminBreadcrumbModule } from '../../admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
    declarations: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldDialogComponent,
        SymbologyDialogComponent,
        EditFormDialogComponent,
        FieldsListComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        DragDropModule,
        MatDialogModule,
        MatButtonModule,
        MatSnackBarModule,
        MatTabsModule,
        MatCardModule,
        MatIconModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatInputModule,
        MatStepperModule,
        MatCheckboxModule,
        MatSelectModule,
        MatDividerModule,
        ObservationEditModule,
        AdminBreadcrumbModule
    ],
    exports: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldsListComponent
    ],
})
export class AdminEventFormModule { }
