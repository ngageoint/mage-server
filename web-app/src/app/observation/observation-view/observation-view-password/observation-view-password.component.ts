import { Component, input } from '@angular/core';
import { PasswordPipe } from './password.pipe';

@Component({
    selector: 'observation-view-password',
    templateUrl: './observation-view-password.component.html',
    styleUrls: ['./observation-view-password.component.scss'],
    imports: [PasswordPipe]
})
export class ObservationViewPasswordComponent {
  field = input<any>()
}
