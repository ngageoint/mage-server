import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

interface RadioField {
  title: string,
  name: string,
  required: boolean,
}

@Component({
  selector: 'observation-edit-radio',
  templateUrl: './observation-edit-radio.component.html',
  styleUrls: ['./observation-edit-radio.component.scss']
})
export class ObservationEditRadioComponent {
  @Input() formGroup: FormGroup
  @Input() definition: RadioField
}
