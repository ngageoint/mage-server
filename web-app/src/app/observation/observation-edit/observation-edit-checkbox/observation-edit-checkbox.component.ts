import { Component, Input } from '@angular/core';

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
export class ObservationEditCheckboxComponent {
  @Input() field: CheckboxField;
}
