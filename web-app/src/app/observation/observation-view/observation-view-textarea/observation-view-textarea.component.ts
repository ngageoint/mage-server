import { Component, Input } from '@angular/core';

@Component({
  selector: 'observation-view-textarea',
  templateUrl: './observation-view-textarea.component.html',
  styleUrls: ['./observation-view-textarea.component.scss']
})
export class ObservationViewTextareaComponent {
  @Input() field: any
}
