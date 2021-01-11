import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'observation-edit-geometry-map',
  templateUrl: './observation-edit-geometry-map.component.html',
  styleUrls: ['./observation-edit-geometry-map.component.scss']
})
export class ObservationEditGeometryMapComponent {
  @Input() feature: any
  @Output() onEdit = new EventEmitter<void>();

  edit(): void {
    this.onEdit.emit();
  }

}
