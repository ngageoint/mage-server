import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'observation-view-geometry',
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
