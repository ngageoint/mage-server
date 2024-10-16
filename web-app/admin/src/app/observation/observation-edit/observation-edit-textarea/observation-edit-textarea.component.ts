import { Component, Input } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

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
  @Input() formGroup: UntypedFormGroup
  @Input() definition: TextareaField
}
