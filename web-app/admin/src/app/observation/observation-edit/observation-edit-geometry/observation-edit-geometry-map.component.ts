import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MapClipComponent } from 'mage-web-app/map/clip/clip.component';

@Component({
  selector: 'observation-edit-geometry-map',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MapClipComponent
  ],
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
