import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-checkbox',
  templateUrl: './observation-view-checkbox.component.html',
  styleUrls: ['./observation-view-checkbox.component.scss']
})
export class ObservationViewCheckboxComponent {
  @Input() field: any
}
