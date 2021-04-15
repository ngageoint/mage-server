import { Component, Input } from '@angular/core';

interface NumberField {
  title: string,
  name: string,
  value: number,
  required: boolean,
  /*
  TODO: angular9 - added these to fix template errors; are they really
  optional? nullable? should probably move to this interface to a forms
  model module anyway
  */
  min?: number,
  max?: number
}

@Component({
  selector: 'observation-edit-number',
  templateUrl: './observation-edit-number.component.html',
  styleUrls: ['./observation-edit-number.component.scss']
})
export class ObservationEditNumberComponent {
  @Input() field: NumberField;
}
