import { NgModule } from '@angular/core';

import { AdminEventFormPreviewComponent } from './admin-event-form-preview/admin-event-form-preview.component';
import { AdminEventFormPreviewDialogComponent } from './admin-event-form-preview/form-preview-dialog/admin-event-form-preview-dialog.component';
import { FormDetailsComponent } from './form-details/form-details.component';
import { FieldsListComponent } from './fields-list/fields-list.component';

@NgModule({
    imports: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldsListComponent
    ],
    exports: [
        AdminEventFormPreviewComponent,
        AdminEventFormPreviewDialogComponent,
        FormDetailsComponent,
        FieldsListComponent
    ],
})
export class AdminEventFormModule { }
