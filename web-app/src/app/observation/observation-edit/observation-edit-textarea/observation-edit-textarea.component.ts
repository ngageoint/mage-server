import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

interface TextareaField {
  title: string,
  name: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-textarea',
  templateUrl: './observation-edit-textarea.component.html',
  styleUrls: ['./observation-edit-textarea.component.scss']
})
export class ObservationEditTextareaComponent {
  @Input() formGroup: FormGroup
  @Input() definition: TextareaField
}
