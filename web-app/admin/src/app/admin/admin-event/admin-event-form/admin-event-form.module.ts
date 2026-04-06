import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { CoreModule } from 'admin/src/app/core/core.module';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview/form-preview-dialog/admin-event-form-preview-dialog.component';
import { ObservationModule } from '../../../observation/observation.module';
import { FormDetailsComponent } from './form-details/form-details.component';
import { FieldDialogComponent } from './form-details/field-dialog/field-dialog.component';
import { SymbologyDialogComponent } from './form-details/symbology-dialog/symbology-dialog.component';
import { FieldsListComponent } from './fields-list/fields-list.component';
import { AdminBreadcrumbModule } from '../../admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
    declarations: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldDialogComponent,
        SymbologyDialogComponent,
        FieldsListComponent
    ],
    imports: [
        CommonModule,
        CoreModule,
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
        ObservationModule,
        AdminBreadcrumbModule
    ],
    exports: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldsListComponent
    ]
})
export class AdminEventFormModule { }
