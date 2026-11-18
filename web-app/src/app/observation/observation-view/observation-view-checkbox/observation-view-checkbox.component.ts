import { Component, input } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
    selector: 'observation-view-checkbox',
    templateUrl: './observation-view-checkbox.component.html',
    styleUrls: ['./observation-view-checkbox.component.scss'],
    imports: [MatCheckboxModule]
})
export class ObservationViewCheckboxComponent {
  field = input<any>()
}
