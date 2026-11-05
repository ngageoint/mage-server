import { Component, input } from '@angular/core';
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
    templateUrl: './observation-edit-radio.component.html',
    styleUrls: ['./observation-edit-radio.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatRadioModule]
})
export class ObservationEditRadioComponent {
  formGroup = input<UntypedFormGroup>()
  definition = input<RadioField>()
}
