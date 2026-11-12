import { Component, computed, input } from '@angular/core';
import { GeometryModule } from '../../../geometry/geometry.module';
import { MapClipComponent } from '../../../map/clip/clip.component';

@Component({
    selector: 'observation-view-geometry',
    templateUrl: './observation-view-geometry.component.html',
    styleUrls: ['./observation-view-geometry.component.scss'],
    imports: [GeometryModule, MapClipComponent]
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
