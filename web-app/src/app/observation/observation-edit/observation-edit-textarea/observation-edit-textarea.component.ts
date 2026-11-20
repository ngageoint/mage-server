import { Component, input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface TextareaField {
  title: string,
  name: string,
  required: boolean
}

@Component({
    selector: 'observation-edit-textarea',
    templateUrl: './observation-edit-textarea.component.html',
    styleUrls: ['./observation-edit-textarea.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule]
})
export class ObservationEditTextareaComponent {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<TextareaField>()
}
