import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
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
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './observation-edit-text.component.html',
  styleUrls: ['./observation-edit-text.component.scss']
})
export class ObservationEditTextComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: TextField
}
