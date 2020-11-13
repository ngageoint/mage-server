import { Component, Input } from '@angular/core';

interface TextField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss']
})
export class ObservationEditTextComponent {
  @Input() field: TextField;
}
