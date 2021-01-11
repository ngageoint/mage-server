import { Component, Input } from '@angular/core';

interface NumberField {
  title: string,
  name: string,
  value: number,
  required: boolean
}

@Component({
  selector: 'observation-edit-number',
  templateUrl: './observation-edit-number.component.html',
  styleUrls: ['./observation-edit-number.component.scss']
})
export class ObservationEditNumberComponent {
  @Input() field: NumberField;
}
