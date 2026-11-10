import { Component, input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface EmailField {
  title: string,
  name: string,
  required: boolean
}

@Component({
    selector: 'observation-edit-email',
    templateUrl: './observation-edit-email.component.html',
    styleUrls: ['./observation-edit-email.component.scss'],
    imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule]
})
export class ObservationEditEmailComponent {
  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<EmailField>()
}
