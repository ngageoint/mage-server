import { Component, Input } from '@angular/core';

interface EmailField {
  title: string,
  name: string,
  value: string,
  required: boolean
}

@Component({
  selector: 'observation-edit-email',
  templateUrl: './email.component.html',
  styleUrls: ['./email.component.scss']
})
export class ObservationEditEmailComponent {
  @Input() field: EmailField
}
