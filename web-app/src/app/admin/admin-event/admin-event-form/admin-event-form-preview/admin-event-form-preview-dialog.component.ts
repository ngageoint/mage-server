import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'admin-event-form-preview-dialog',
  templateUrl: './admin-event-form-preview-dialog.component.html',
  styleUrls: ['./admin-event-form-preview-dialog.component.scss']
})
export class AdminEventFormPreviewDialogComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public formDefinition: any) { }

  formGroup: FormGroup

  ngOnInit(): void {
    this.formGroup = new FormGroup({
      id: new FormControl(0),
      formId: new FormControl(0)
    });

    this.formDefinition.fields
      .filter(field => !field.archived)
      .sort((a, b) => a.id - b.id)
      .forEach(field => {
        const fieldControl = new FormControl(field.value, field.required ? Validators.required : null);
        this.formGroup.addControl(field.name, fieldControl);
      })
  }

}
