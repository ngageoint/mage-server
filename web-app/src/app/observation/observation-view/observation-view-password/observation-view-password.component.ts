
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PasswordPipe } from './password.pipe';

@Component({
  selector: 'observation-view-password',
  standalone: true,
  imports: [
    CommonModule,
    PasswordPipe
  ],
  templateUrl: './observation-view-password.component.html',
  styleUrls: ['./observation-view-password.component.scss']
})
export class ObservationViewPasswordComponent {
  @Input() field: any
}
