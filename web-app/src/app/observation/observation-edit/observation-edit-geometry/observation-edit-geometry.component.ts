import { TemplatePortal } from '@angular/cdk/portal'
import { Component, effect, inject, input, output, signal, TemplateRef, viewChild, ViewContainerRef } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { Feature, Geometry } from 'geojson'
import { LocalStorageService } from '../../../http/local-storage.service'
import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component'
import { ObservationEditGeometryFormComponent } from './observation-edit-geometry-form.component'
import { GeometryModule } from 'mage-web-app/geometry/geometry.module'

export type GeometryEditEvent =
  | { action: 'edit', portal: TemplatePortal<any> }
  | { action: 'none' }

@Component({
    selector: 'observation-edit-geometry',
    templateUrl: './observation-edit-geometry.component.html',
    styleUrls: ['./observation-edit-geometry.component.scss'],
   imports: [
      MatButtonModule,
      ObservationEditGeometryMapComponent,
      ObservationEditGeometryFormComponent,
      GeometryModule
   ]
})
export class ObservationEditGeometryComponent {
  private readonly localStorageService: LocalStorageService = inject(LocalStorageService)
  private readonly viewContainerRef = inject(ViewContainerRef)

  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<any>()

  featureId = input.required<string>()
  featureStyle = input<any>()

  featureEdit = output<GeometryEditEvent>()

  editorTemplate = viewChild.required<TemplateRef<any>>('editor')

  mapFeature = signal<any>(null)
  editFeature = signal<any>(null)

  constructor() {
    effect(() => {
      const formGroup = this.formGroup()
      const definition = this.definition()
      const featureStyle = this.featureStyle()
      this.mapFeature.set({
        id: this.featureId(),
        type: 'Feature',
        geometry: formGroup.get(definition.name).value,
        style: featureStyle ? JSON.parse(JSON.stringify(featureStyle)) : null
      })
    })
  }

  startGeometryEdit(): void {
    const value = this.formGroup().get(this.definition().name).value
    if (value) {
      this.editFeature.set({
        id: this.featureId(),
        type: 'Feature',
        geometry: value,
        style: this.featureStyle() ? JSON.parse(JSON.stringify(this.featureStyle())) : null
      })
    } else {
      const mapPosition = this.localStorageService.getMapPosition();
      this.editFeature.set({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapPosition.center.lng, mapPosition.center.lat]
        },
        style: this.featureStyle() ? JSON.parse(JSON.stringify(this.featureStyle())) : null
      })
    }

    this.featureEdit.emit({
      action: 'edit',
      portal: new TemplatePortal(this.editorTemplate(), this.viewContainerRef)
    })
  }

  saveGeometryEdit(event: any): void {
    this.mapFeature.set(event.feature)

    this.formGroup().get(this.definition().name).setValue(this.normalizeGeometry(event.feature))

    this.featureEdit.emit({
      action: 'none'
    })
  }

  cancelGeometryEdit(): void {
    this.featureEdit.emit({
      action: 'none'
    })
  }

  private normalizeGeometry(feature: Feature<Geometry>): Geometry {
    const geometry = feature ? feature.geometry : null
    if (!geometry) return geometry

    switch (geometry.type) {
      case 'Point':
        if (geometry.coordinates[0] < -180) geometry.coordinates[0] = geometry.coordinates[0] + 360
        else if (geometry.coordinates[0] > 180) geometry.coordinates[0] = geometry.coordinates[0] - 360
        break;
      case 'LineString':
        for (const coordinate of geometry.coordinates) {
          while (coordinate[0] < -180) coordinate[0] = coordinate[0] + 360
          while (coordinate[0] > 180) coordinate[0] = coordinate[0] - 360
        }
        break;
      case 'Polygon':
        for (const poly of geometry.coordinates) {
          for (const coord of poly) {
            while (coord[0] < -180) coord[0] = coord[0] + 360
            while (coord[0] > 180) coord[0] = coord[0] - 360
          }
        }
        break;
    }

    return geometry
  }

}
