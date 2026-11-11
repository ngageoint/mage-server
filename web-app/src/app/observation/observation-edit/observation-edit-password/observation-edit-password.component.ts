import { Component, input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface PasswordField {
  title: string,
  name: string,
  required: boolean
}

@Component({
    selector: 'observation-edit-password',
    templateUrl: './observation-edit-password.component.html',
    styleUrls: ['./observation-edit-password.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule]
})
export class ObservationEditPasswordComponent {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<PasswordField>()
}
