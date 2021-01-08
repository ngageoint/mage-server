import { Component, Input } from '@angular/core';

interface RadioField {
  title: string,
  name: string,
  value: string,
  required: boolean,
}

@Component({
  selector: 'observation-edit-radio',
  templateUrl: './observation-edit-radio.component.html',
  styleUrls: ['./observation-edit-radio.component.scss']
})
export class ObservationEditRadioComponent {
  @Input() field: RadioField
}
