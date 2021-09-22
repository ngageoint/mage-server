import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

interface TextField {
  title: string,
  name: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-text',
  templateUrl: './observation-edit-text.component.html',
  styleUrls: ['./observation-edit-text.component.scss']
})
export class ObservationEditTextComponent {
  @Input() formGroup: FormGroup
  @Input() definition: TextField
}
