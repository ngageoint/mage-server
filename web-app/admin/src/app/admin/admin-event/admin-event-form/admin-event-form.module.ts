import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CoreModule } from 'admin/src/app/core/core.module';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview/form-preview-dialog/admin-event-form-preview-dialog.component';
import { ObservationModule } from '../../../observation/observation.module';
import { FormDetailsComponent } from './form-details/form-details.component';
import { FieldDialogComponent } from './form-details/field-dialog/field-dialog.component';
import { FieldsListComponent } from './fields-list/fields-list.component';
import { AdminBreadcrumbModule } from '../../admin-breadcrumb/admin-breadcrumb.module';

@NgModule({
    declarations: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldDialogComponent,
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
