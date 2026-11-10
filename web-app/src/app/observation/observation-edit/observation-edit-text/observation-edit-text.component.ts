import { Component, input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface TextField {
  title: string,
  name: string,
  required: boolean
}

@Component({
    selector: 'observation-edit-text',
    templateUrl: './observation-edit-text.component.html',
    styleUrls: ['./observation-edit-text.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule]
})
export class ObservationEditTextComponent {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<TextField>()
}
