import { Component, Input } from '@angular/core';

interface TextareaField {
  title: string,
  name: string,
  value?: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-textarea',
  templateUrl: './observation-edit-textarea.component.html',
  styleUrls: ['./observation-edit-textarea.component.scss']
})
export class ObservationEditTextareaComponent {
  @Input() field: TextareaField;
}
