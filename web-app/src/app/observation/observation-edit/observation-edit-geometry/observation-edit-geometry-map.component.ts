import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MapClipComponent } from '../../../map/clip/clip.component';

@Component({
    selector: 'observation-edit-geometry-map',
    templateUrl: './observation-edit-geometry-map.component.html',
    styleUrls: ['./observation-edit-geometry-map.component.scss'],
    imports: [MatButtonModule, MatIconModule, MapClipComponent]
})
export class ObservationEditGeometryMapComponent {
  feature = input<any>()
  onEdit = output<void>();

  edit(): void {
    this.onEdit.emit();
  }

}
