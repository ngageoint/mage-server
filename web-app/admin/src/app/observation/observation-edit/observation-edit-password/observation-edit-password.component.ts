import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './observation-edit-password.component.html',
  styleUrls: ['./observation-edit-password.component.scss']
})
export class ObservationEditPasswordComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: PasswordField
}
