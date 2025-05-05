import { Component, Input } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

interface PasswordField {
  title: string,
  name: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-password',
  templateUrl: './observation-edit-password.component.html',
  styleUrls: ['./observation-edit-password.component.scss']
})
export class ObservationEditPasswordComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: PasswordField
}
