import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-multiselectdropdown',
  templateUrl: './observation-view-multiselectdropdown.component.html',
  styleUrls: ['./observation-view-multiselectdropdown.component.scss']
})
export class ObservationViewMultiselectdropdownComponent {
  @Input() field: any
}
