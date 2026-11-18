import { Component, input } from '@angular/core';
import { MomentModule } from '../../../moment/moment.module';

@Component({
    selector: 'observation-view-date',
    templateUrl: './observation-view-date.component.html',
    styleUrls: ['./observation-view-date.component.scss'],
    imports: [MomentModule]
})
export class ObservationViewDateComponent {
  field = input<any>()
}
