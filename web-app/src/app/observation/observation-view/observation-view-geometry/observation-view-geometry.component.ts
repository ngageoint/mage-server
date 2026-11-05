import { Component, computed, input } from '@angular/core';
import { GeometryModule } from '../../../geometry/geometry.module';
import { MapClipModule } from '../../../map/clip/map-clip.module';

@Component({
    selector: 'observation-view-geometry',
    templateUrl: './observation-view-geometry.component.html',
    styleUrls: ['./observation-view-geometry.component.scss'],
    imports: [GeometryModule, MapClipModule]
})
export class ObservationViewGeometryComponent {
  field = input<any>()
  featureStyle = input<any>()

  feature = computed(() => {
    const field = this.field()
    if (!field?.value) return undefined

    return {
      type: 'Feature',
      geometry: field.value,
      style: { ...this.featureStyle() }
    }
  })
}
