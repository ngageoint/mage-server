import { Component, ElementRef, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { Feature, Geometry } from 'geojson'
import { LocalStorageService } from 'src/app/upgrade/ajs-upgraded-providers'

@Component({
  selector: 'observation-edit-geometry',
  templateUrl: './observation-edit-geometry.component.html',
  styleUrls: ['./observation-edit-geometry.component.scss']
})
export class ObservationEditGeometryComponent implements OnChanges {
  @Input() formGroup: FormGroup
  @Input() definition: any

  @Input() featureId: string
  @Input() featureStyle: any

  @Output() onFeatureEdit = new EventEmitter<any>()

  @ViewChild('geometry', { static: true }) geometryElement: ElementRef

  edit = false
  mapFeature: any
  editFeature: any

  constructor(private element: ElementRef, @Inject(LocalStorageService) private localStorageService: any) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.formGroup && changes.formGroup.currentValue) {
      this.mapFeature = {
        id: this.featureId,
        type: 'Feature',
        geometry: changes.formGroup.currentValue.get(this.definition.name).value
      }
    }

    if (changes.featureStyle && changes.featureStyle.currentValue) {
      this.mapFeature = {
        id: this.featureId,
        type: 'Feature',
        geometry: this.formGroup.get(this.definition.name).value,
        style: this.featureStyle ? JSON.parse(JSON.stringify(this.featureStyle)) : null
      }
    }
  }

  startGeometryEdit(): void {
    this.edit = true;

    const value = this.formGroup.get(this.definition.name).value
    if (value) {
      this.editFeature = {
        id: this.featureId,
        type: 'Feature',
        geometry: value,
        style: this.featureStyle ? JSON.parse(JSON.stringify(this.featureStyle)) : null
      }
    } else {
      const mapPosition = this.localStorageService.getMapPosition();
      this.editFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapPosition.center.lng, mapPosition.center.lat]
        },
        style: this.featureStyle ? JSON.parse(JSON.stringify(this.featureStyle)) : null
      }
    }

    this.onFeatureEdit.emit({
      action: 'edit',
      source: this.geometryElement
    })
  }

  saveGeometryEdit(event: any): void {
    this.edit = false
    this.mapFeature = event.feature

    // TODO normalize geometry
    this.formGroup.get(this.definition.name).setValue(this.normalizeGeometry(event.feature))

    this.onFeatureEdit.emit({
      action: 'none',
      source: this.geometryElement
    })
  }

  cancelGeometryEdit(): void {
    this.edit = false;

    this.onFeatureEdit.emit({
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
