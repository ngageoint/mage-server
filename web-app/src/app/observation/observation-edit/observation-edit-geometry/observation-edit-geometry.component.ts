import { Component, effect, ElementRef, EventEmitter, inject, input, Output, signal, viewChild } from '@angular/core'
import { UntypedFormGroup } from '@angular/forms'
import { Feature, Geometry } from 'geojson'
import { LocalStorageService } from '../../../http/local-storage.service'
import { ObservationEditGeometryMapComponent } from './observation-edit-geometry-map.component'
import { ObservationEditGeometryFormComponent } from './observation-edit-geometry-form.component'
import { GeometryModule } from 'mage-web-app/geometry/geometry.module'

export type GeometryEditEvent =
  | { action: 'edit', source: ElementRef<HTMLElement> }
  | { action: 'none', source?: ElementRef<HTMLElement> }

@Component({
    selector: 'observation-edit-geometry',
    templateUrl: './observation-edit-geometry.component.html',
    styleUrls: ['./observation-edit-geometry.component.scss'],
   imports: [
      ObservationEditGeometryMapComponent,
      ObservationEditGeometryFormComponent,
      GeometryModule
   ]
})
export class ObservationEditGeometryComponent {
  private readonly localStorageService: LocalStorageService = inject(LocalStorageService)

  formGroup = input.required<UntypedFormGroup>()
  definition = input.required<any>()

  featureId = input.required<string>()
  featureStyle = input<any>()

  @Output() featureEdit = new EventEmitter<GeometryEditEvent>()

  geometryElement = viewChild.required<ElementRef<HTMLElement>>('geometry')
  geometryForm = viewChild.required(ObservationEditGeometryFormComponent)

  edit = false
  mapFeature = signal<any>(null)

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
    this.edit = true;

    const value = this.formGroup().get(this.definition().name).value
    if (value) {
      this.geometryForm().startEdit({
        id: this.featureId(),
        type: 'Feature',
        geometry: value,
        style: this.featureStyle() ? JSON.parse(JSON.stringify(this.featureStyle())) : null
      })
    } else {
      const mapPosition = this.localStorageService.getMapPosition();
      this.geometryForm().startEdit({
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
      source: this.geometryElement()
    })
  }

  saveGeometryEdit(event: any): void {
    this.edit = false
    this.mapFeature.set(event.feature)

    this.formGroup().get(this.definition().name).setValue(this.normalizeGeometry(event.feature))

    this.featureEdit.emit({
      action: 'none',
      source: this.geometryElement()
    })
  }

  cancelGeometryEdit(): void {
    this.edit = false;

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
        for (let i = 0; i < geometry.coordinates.length; i++) {
          const coord = geometry.coordinates[i];
          while (coord[0] < -180) coord[0] = coord[0] + 360
          while (coord[0] > 180) coord[0] = coord[0] - 360
        }
        break;
      case 'Polygon':
        for (let p = 0; p < geometry.coordinates.length; p++) {
          const poly = geometry.coordinates[p];
          for (let i = 0; i < poly.length; i++) {
            const coord = poly[i];
            while (coord[0] < -180) coord[0] = coord[0] + 360
            while (coord[0] > 180) coord[0] = coord[0] - 360
          }
        }
        break;
    }

    return geometry
  }

}
