import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

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
  @Input() formGroup: FormGroup
  @Input() definition: EmailField
}
