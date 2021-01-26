import { Component, ElementRef, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { LocalStorageService } from 'src/app/upgrade/ajs-upgraded-providers'

@Component({
  selector: 'observation-edit-geometry',
  templateUrl: './observation-edit-geometry.component.html',
  styleUrls: ['./observation-edit-geometry.component.scss']
})
export class ObservationEditGeometryComponent implements OnChanges {
  @Input() field: any // TODO remove

  @Input() formGroup: FormGroup
  @Input() definition: any

  @Input() featureId: string
  @Input() featureStyle: any

  @Output() onFeatureEdit = new EventEmitter<any>()
  @Output() onFeatureChanged = new EventEmitter<any>()

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
        geometry: changes.formGroup.currentValue.get(this.definition.name).value,
        style: JSON.parse(JSON.stringify(this.featureStyle))
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
        style: { ...this.featureStyle }
      }
    } else {
      const mapPosition = this.localStorageService.getMapPosition();
      this.editFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapPosition.center.lng, mapPosition.center.lat]
        },
        style: JSON.parse(JSON.stringify(this.featureStyle))
      }
    }

    this.onFeatureEdit.emit({
      action: 'edit',
      source: this.geometryElement
    })
  }

  saveGeometryEdit($event: any): void {
    this.edit = false
    this.mapFeature = $event.feature

    this.onFeatureChanged.emit({
      feature: $event.feature
    })

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

}
