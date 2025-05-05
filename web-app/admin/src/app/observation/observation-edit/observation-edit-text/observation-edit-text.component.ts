import { Component, Input } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

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
  @Input() formGroup: UntypedFormGroup
  @Input() definition: TextField
}
