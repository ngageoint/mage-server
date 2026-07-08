import { Component, Input } from '@angular/core';

@Component({
    selector: 'observation-view-date',
    templateUrl: './observation-view-date.component.html',
    styleUrls: ['./observation-view-date.component.scss'],
    standalone: false
})
export class ObservationViewDateComponent {
  @Input() field: any
}
