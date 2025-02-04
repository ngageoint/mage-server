import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';

interface CheckboxField {
  title: string,
  name: string,
  value: boolean,
  required: boolean
}

@Component({
  selector: 'observation-edit-checkbox',
  templateUrl: './observation-edit-checkbox.component.html',
  styleUrls: ['./observation-edit-checkbox.component.scss']
})
export class ObservationEditCheckboxComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: CheckboxField

  control: UntypedFormControl

  ngOnInit(): void {
    this.control = this.formGroup.get(this.definition.name) as UntypedFormControl
  }

  checked(event: MatCheckboxChange): void {
    this.control.markAsTouched()
    this.control.setValue(event.checked ? true : null)
  }
}
