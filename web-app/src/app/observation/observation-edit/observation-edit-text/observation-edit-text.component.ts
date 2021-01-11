import { Component, Input } from '@angular/core';

interface TextField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-text',
  templateUrl: './observation-edit-text.component.html',
  styleUrls: ['./observation-edit-text.component.scss']
})
export class ObservationEditTextComponent {
  @Input() field: TextField;
}
