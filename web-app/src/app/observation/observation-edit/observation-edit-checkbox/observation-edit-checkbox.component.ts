import { Component, input, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';

interface CheckboxField {
  title: string,
  name: string,
  value: boolean,
  required: boolean
}

@Component({
    selector: 'observation-edit-checkbox',
    templateUrl: './observation-edit-checkbox.component.html',
    styleUrls: ['./observation-edit-checkbox.component.scss'],
    imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule]
})
export class ObservationEditCheckboxComponent implements OnInit {
  formGroup = input<UntypedFormGroup>()
  definition = input<CheckboxField>()

  control: UntypedFormControl

  ngOnInit(): void {
    this.control = this.formGroup()?.get(this.definition()?.name) as UntypedFormControl
  }

  checked(event: MatCheckboxChange): void {
    this.control.markAsTouched()
    this.control.setValue(event.checked ? true : null)
  }
}
