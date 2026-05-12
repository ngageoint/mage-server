import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'observation-view-checkbox',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule
  ],
  templateUrl: './observation-view-checkbox.component.html',
  styleUrls: ['./observation-view-checkbox.component.scss']
})
export class ObservationViewCheckboxComponent {
  @Input() field: any
}
