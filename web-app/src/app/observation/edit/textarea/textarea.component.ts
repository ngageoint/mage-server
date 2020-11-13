import { Component, Input } from '@angular/core';

interface TextareaField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-textarea',
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.scss']
})
export class ObservationEditTextareaComponent {
  @Input() field: TextareaField;
}
