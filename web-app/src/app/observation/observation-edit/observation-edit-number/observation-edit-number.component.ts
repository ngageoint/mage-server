import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface NumberField {
  title: string,
  name: string,
  value: number,
  required: boolean,
  min?: number,
  max?: number
}

@Component({
  selector: 'observation-edit-number',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './observation-edit-number.component.html',
  styleUrls: ['./observation-edit-number.component.scss']
})
export class ObservationEditNumberComponent implements OnInit {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: NumberField

  ngOnInit(): void {
    const control = this.formGroup.get(this.definition.name)
    const validators: ValidatorFn[] = []
    if (this.definition.required) validators.push(Validators.required)
    if (this.definition.min != null) validators.push(Validators.min(this.definition.min))
    if (this.definition.max != null) validators.push(Validators.max(this.definition.max))
    control.setValidators(validators)
  }
}
