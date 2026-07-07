import { Component, Input } from '@angular/core';

@Component({
    selector: 'observation-view-text',
    templateUrl: './observation-view-text.component.html',
    styleUrls: ['./observation-view-text.component.scss'],
    standalone: false
})
export class ObservationViewTextComponent {
  @Input() field: any
}
