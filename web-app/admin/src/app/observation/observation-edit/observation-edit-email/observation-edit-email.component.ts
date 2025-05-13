import { Component, Input } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

interface EmailField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-email',
  templateUrl: './observation-edit-email.component.html',
  styleUrls: ['./observation-edit-email.component.scss']
})
export class ObservationEditEmailComponent {
  @Input() formGroup: UntypedFormGroup
  @Input() definition: EmailField
}
