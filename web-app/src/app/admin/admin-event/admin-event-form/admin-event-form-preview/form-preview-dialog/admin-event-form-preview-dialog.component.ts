import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA as MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ObservationEditModule } from 'mage-web-app/observation/observation-edit/observation-edit.module';

@Component({
    selector: 'admin-event-form-preview-dialog',
    templateUrl: './admin-event-form-preview-dialog.component.html',
    styleUrls: ['./admin-event-form-preview-dialog.component.scss'],
    standalone: true,
    imports: [
      MatDialogModule,
      MatButtonModule,
      ObservationEditModule
    ]
})
export class AdminEventFormPreviewDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public formDefinition: any) { }

  formGroup: UntypedFormGroup

  ngOnInit(): void {
    this.formGroup = new UntypedFormGroup({
      id: new UntypedFormControl(0),
      formId: new UntypedFormControl(0)
    });

    this.formDefinition.fields
      .filter(field => !field.archived)
      .sort((a, b) => a.id - b.id)
      .forEach(field => {
        const fieldControl = new UntypedFormControl(field.value, field.required ? Validators.required : null);
        this.formGroup.addControl(field.name, fieldControl);
      })
  }

}
