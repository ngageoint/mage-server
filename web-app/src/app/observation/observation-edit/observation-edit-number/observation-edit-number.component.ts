import { Component, input, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface NumberField {
  title: string,
  name: string,
  required: boolean,
  min?: number,
  max?: number
}

@Component({
    selector: 'observation-edit-number',
    templateUrl: './observation-edit-number.component.html',
    styleUrls: ['./observation-edit-number.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule]
})
export class ObservationEditNumberComponent implements OnInit {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<NumberField>()

  ngOnInit(): void {
    const definition = this.definition()
    const control = this.formGroup().get(definition.name)
    const validators: ValidatorFn[] = []
    if (definition.required) validators.push(Validators.required)
    if (definition.min != null) validators.push(Validators.min(definition.min))
    if (definition.max != null) validators.push(Validators.max(definition.max))
    control?.setValidators(validators)
  }
}
