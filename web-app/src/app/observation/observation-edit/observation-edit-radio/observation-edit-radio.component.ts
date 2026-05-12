import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';

/**
 * TODO: move to forms model module (which doesn't exist yet)
 */
interface RadioField {
  title: string,
  name: string,
  required: boolean,
  choices: { title: string }[]
}

@Component({
  selector: 'observation-edit-radio',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatRadioModule,
    MatFormFieldModule
  ],
  templateUrl: './observation-edit-radio.component.html',
  styleUrls: ['./observation-edit-radio.component.scss']
})
export class ObservationEditRadioComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: RadioField
}
