import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GeometryModule } from 'mage-web-app/geometry/geometry.module';
import { MapClipComponent } from 'mage-web-app/map/clip/clip.component';

@Component({
  selector: 'observation-view-geometry',
  standalone: true,
  imports: [
    CommonModule,
    MapClipComponent,
    GeometryModule
  ],
  templateUrl: './observation-view-geometry.component.html',
  styleUrls: ['./observation-view-geometry.component.scss']
})
export class ObservationViewGeometryComponent implements OnChanges {
  @Input() field: any
  @Input() featureStyle: any

  feature: any

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.field && this.field && this.field.value) {
      this.feature = {
        type: 'Feature',
        geometry: this.field.value,
        style: { ...this.featureStyle }
      }
    }
  }
}
