import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

interface EmailField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './observation-edit-email.component.html',
  styleUrls: ['./observation-edit-email.component.scss']
})
export class ObservationEditEmailComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: EmailField
}
