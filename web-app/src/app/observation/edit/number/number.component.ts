import { Component, Input } from '@angular/core';

interface NumberField {
  title: string,
  name: string,
  value: number,
  required: boolean
}

@Component({
  selector: 'observation-edit-number',
  templateUrl: './number.component.html',
  styleUrls: ['./number.component.scss']
})
export class ObservationEditNumberComponent {
  @Input() field: NumberField;
}
