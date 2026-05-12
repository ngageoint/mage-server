import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MomentModule } from 'mage-web-app/moment/moment.module';

@Component({
  selector: 'observation-view-date',
  standalone: true,
  imports: [
    CommonModule,
    MomentModule
  ],
  templateUrl: './observation-view-date.component.html',
  styleUrls: ['./observation-view-date.component.scss']
})
export class ObservationViewDateComponent {
  @Input() field: any
}
