
import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-password',
  templateUrl: './observation-view-password.component.html',
  styleUrls: ['./observation-view-password.component.scss']
})
export class ObservationViewPasswordComponent {
  @Input() field: any
}
