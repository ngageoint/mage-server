import { Component, Directive, EventEmitter, Inject, Input, OnChanges, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { AbstractControl, NgModel, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import mgrs from 'mgrs';
import { DMS } from 'src/app/geometry/geometry-dms';
import { GeometryService, LocalStorageService, MapService } from 'src/app/upgrade/ajs-upgraded-providers';

@Directive({
  selector: '[mgrs][formControlName],[mgrs][formControl],[mgrs][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: MGRSValidatorDirective, multi: true }]
})
export class MGRSValidatorDirective implements Validator {

  validate(control: AbstractControl): ValidationErrors | null {
    let error: ValidationErrors | null
    try {
      mgrs.toPoint(control.value)
    } catch(e) {
      error = {
        mgrs: {
          value: control.value
        }
      };
    }
    return error;
  }
}

@Directive({
  selector: '[dmsValue][formControlName],[dmsValue][formControl],[dmsValue][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: DMSValidatorDirective, multi: true }]
})
export class DMSValidatorDirective implements Validator {
  @Input()
  dmsValue: string

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.dmsValue === 'latitude' && DMS.validateLatitudeFromDMS(control.value)) {
      return null
    } else if (this.dmsValue === 'longitude' && DMS.validateLongitudeFromDMS(control.value)) {
      return null
    }
    const error: ValidationErrors | null = {
      dms: {
        value: control.value
      }
    }
    return error;
  }

}

@Component({
  selector: 'observation-edit-geometry-form',
  templateUrl: './observation-edit-geometry-form.component.html',
  styleUrls: ['./observation-edit-geometry-form.component.scss'],
  providers: [{ provide: NG_VALIDATORS,  useExisting: MGRSValidatorDirective, multi: true },
    { provide: NG_VALIDATORS, useExisting: DMSValidatorDirective, multi: true }]
})
export class ObservationEditGeometryFormComponent implements OnChanges {
  @Input() feature: any
  @Output() save = new EventEmitter<any>()
  @Output() cancel = new EventEmitter<any>()

  @ViewChild('mgrsModel') mgrsModel: NgModel;
  @ViewChild('latitudeDmsModel') latitudeDmsModel: NgModel;
  @ViewChild('longitudeDmsModel') longitudeDmsModel: NgModel;
  @ViewChild('snackbarContainer', { read: ViewContainerRef }) snackBarContainer: ViewContainerRef;

  selectedShapeType = 'Point'
  coordinateSystem = 'wgs84'

  featureEdit: any

  latitude: number
  longitude: number
  mgrs: string
  latitudeDms: string
  longitudeDms: string

  previousLatitudeValue: string
  previousLongitudeValue: string

  userEnteredMgrs: boolean

  selectedVertexIndex: number

  constructor(
    @Inject(MapService) private mapService: any,
    @Inject(GeometryService) private geometryService: any,
    @Inject(LocalStorageService) private localStorageService: any,
    private snackBar: MatSnackBar) {

    this.coordinateSystem = this.localStorageService.getCoordinateSystemEdit()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.feature) {
      this.feature = { ...this.feature }

      this.featureEdit = this.mapService.createFeature(this.feature, {
        geometryChanged: geometry => {
          this.geometryChanged(geometry);
        }, vertexClick: vertex => {
          this.vertexClick(vertex);
        }
      });

      this.selectedVertexIndex = 0;
      this.updateCoordinates();
    }
  }

  geometryChanged(geometry): void {
    this.feature.geometry = geometry;
    this.updateCoordinates();
  }

  vertexClick(vertex): void {
    this.selectedVertexIndex = vertex.index;
    this.updateCoordinates();
  }

  onSave(): void {
    if (this.feature.geometry.type) {
      if (this.geometryService.featureHasIntersections(this.feature)) {
        this.snackBar.open('Invalid geometry, polygons cannot intersect.', null, {
          duration: 2000
        });
        return;
      }
      this.featureEdit.save();
      this.save.emit({ feature: this.feature });
    } else {
      this.mapService.removeFeatureFromLayer({ id: this.feature.id }, 'Observations');
      this.featureEdit.cancel();
      this.save.emit({});
    }
  }

  onCancel(): void {
    this.featureEdit.cancel();
    this.cancel.emit();
  }

  coordinateSystemChange(coordinateSystem): void {
    this.localStorageService.setCoordinateSystemEdit(coordinateSystem);
    this.coordinateSystem = coordinateSystem;
    if (coordinateSystem === 'mgrs') {
      this.mgrs = this.toMgrs(this.feature);
    }
  }

  toMgrs(feature): string {
    switch (feature.geometry.type) {
      case 'Point':
        return mgrs.forward(feature.geometry.coordinates);
      case 'LineString':
        return mgrs.forward(feature.geometry.coordinates[this.selectedVertexIndex]);
      case 'Polygon':
        return mgrs.forward(feature.geometry.coordinates[0][this.selectedVertexIndex]);
    }
  }

  onLatLngDmsChange(latitudeField: boolean): void {
    let finalLatitudeValue = this.latitudeDms
    let finalLongitudeValue = this.longitudeDms
    let oldLength = 0
    let currentLength = 0

    if (latitudeField) {
      oldLength = this.previousLatitudeValue ? this.previousLatitudeValue.length : 0
      currentLength = finalLatitudeValue ? finalLatitudeValue.length : 0
      if (((oldLength - 1) == currentLength) && this.previousLatitudeValue.startsWith(finalLatitudeValue)) {
        this.previousLatitudeValue = finalLatitudeValue
        return
      }
    } else {
      oldLength = this.previousLongitudeValue ? this.previousLongitudeValue.length : 0
      currentLength = finalLongitudeValue ? finalLongitudeValue.length : 0
      if (((oldLength - 1) == currentLength) && this.previousLongitudeValue.startsWith(finalLongitudeValue)) {
        this.previousLongitudeValue = finalLongitudeValue
        return
      }
    }
    let coordinates = { ...this.feature.geometry.coordinates }

    if ((currentLength - oldLength) > 1) {
      let split = latitudeField ? DMS.splitCoordinates(finalLatitudeValue) : DMS.splitCoordinates(finalLongitudeValue)
      if (split.length > 1) {
        if (latitudeField) {
          finalLatitudeValue = split[0]
          if (finalLongitudeValue.length === 0) {
            finalLongitudeValue = split[1]
          }
        } else {
          finalLongitudeValue = split[1]
          if (finalLatitudeValue.length === 0) {
            finalLatitudeValue = split[0]
          }
        }
      }
    }

    const parsedLatitudeDMS =  DMS.parseToDMSString(finalLatitudeValue, false, true)
    const parsedLongitudeDMS = DMS.parseToDMSString(finalLongitudeValue, false, false)
    this.previousLatitudeValue = parsedLatitudeDMS
    finalLatitudeValue = parsedLatitudeDMS
    this.previousLongitudeValue = parsedLongitudeDMS
    finalLongitudeValue = parsedLongitudeDMS


    this.latitudeDms = finalLatitudeValue
    this.longitudeDms = finalLongitudeValue
    this.latitudeDmsModel.control.setValue(this.latitudeDms, {emitEvent:false, emitViewToModelChange:false, emitModelToViewChange:true})
    this.longitudeDmsModel.control.setValue(this.longitudeDms, {emitEvent:false, emitViewToModelChange:false, emitModelToViewChange:true})

    const valid = DMS.validateLatitudeFromDMS(this.latitudeDms) && DMS.validateLongitudeFromDMS(this.longitudeDms)
    if (valid) {

      const latitude = DMS.parse(this.latitudeDms, true)
      const longitude = DMS.parse(this.longitudeDms, false)

      // copy edit field lat/lng in coordinates at correct index
      if (this.feature.geometry.type === 'Point') {
        coordinates = [longitude, latitude]
      } else if (this.feature.geometry.type === 'LineString') {
        coordinates[this.selectedVertexIndex] = [longitude, latitude]
      } else if (this.feature.geometry.type === 'Polygon') {
        if (coordinates[0]) {
          coordinates[0][this.selectedVertexIndex] = [longitude, latitude]
        }
      }

      // transform corrdinates to valid GeoJSON
      this.toGeoJSON(this.feature, coordinates);

      // Check for polygon for intersections
      if (this.hasIntersections(this.feature, coordinates)) {
        return;
      }

      this.feature.geometry.coordinates = coordinates;
      this.featureEdit.update(this.feature);
    } else {
      this.feature.geometry.coordinates = []
    }
  }

  onLatLngChange(): void {
    let coordinates = { ...this.feature.geometry.coordinates }

    // copy edit field lat/lng in coordinates at correct index
    if (this.feature.geometry.type === 'Point') {
      coordinates = [this.longitude, this.latitude]
    } else if (this.feature.geometry.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = [this.longitude, this.latitude]
    } else if (this.feature.geometry.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = [this.longitude, this.latitude]
      }
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.feature, coordinates);

    // Check for polygon for intersections
    if (this.hasIntersections(this.feature, coordinates)) {
      return;
    }

    this.feature.geometry.coordinates = coordinates;
    this.featureEdit.update(this.feature);
  }

  onMgrsChange(): void {
    if (!this.mgrsModel.control.valid) {
      return
    }
    this.userEnteredMgrs = true

    let coordinates = { ...this.feature.geometry.coordinates }

    switch (this.feature.geometry.type) {
      case 'Point':
        coordinates = mgrs.toPoint(this.mgrs);
        break;
      case 'LineString':
        coordinates[this.selectedVertexIndex] = mgrs.toPoint(this.mgrs);
        break;
      case 'Polygon':
        coordinates[0][this.selectedVertexIndex] = mgrs.toPoint(this.mgrs);
        break;
    }

    // transform corrdinates to valid GeoJSON
    this.toGeoJSON(this.feature, coordinates);

    this.feature.geometry.coordinates = coordinates;
    this.featureEdit.update(this.feature);
  }

  hasIntersections(feature, coordinates): boolean {
    if (feature.geometry.type !== 'Point') {
      if (this.geometryService.featureHasIntersections({ geometry: { coordinates: coordinates } })) {
        return true;
      }
    }

    return false;
  }

  toGeoJSON(feature, coordinates): void {
    // Ensure first and last points are the same for polygon
    if (feature.geometry.type === 'Polygon') {
      if (feature.editedVertex === 0) {
        coordinates[0][coordinates[0].length - 1] = coordinates[0][0];
      } else if (feature.editedVertex === coordinates[0].length - 1) {
        coordinates[0][0] = coordinates[0][coordinates[0].length - 1];
      }
    }
  }

  shapeTypeChanged(shapeType?: string): void {
    this.selectedShapeType = shapeType

    switch (shapeType) {
      case 'Point':
        this.feature.geometry.coordinates = []
        this.feature.geometry.type = 'Point'
        break;
      case 'LineString':
        this.feature.geometry.coordinates = []
        this.feature.geometry.type = 'LineString'
        break;
      case 'Polygon':
        this.feature.geometry.coordinates = []
        this.feature.geometry.type = 'Polygon'
        break;
      default:
        this.latitude = null
        this.longitude = null
        this.mgrs = null
        this.latitudeDms = null
        this.longitudeDms = null
        this.previousLatitudeValue = null
        this.previousLongitudeValue = null
        delete this.feature.geometry.type
        this.featureEdit.cancel()
        break;
    }
    if (shapeType) {
      this.onEditShape()
    }
  }

  onEditShape(): void {
    this.featureEdit.update(this.feature);
  }

  updateCoordinates(): void {
    let currentMgrs = this.toMgrs(this.feature);
    if (!this.userEnteredMgrs) {
      this.mgrs = currentMgrs
      this.mgrsModel.control.setValue(this.mgrs, {emitEvent:false, emitViewToModelChange:false, emitModelToViewChange:true})
    }
    this.userEnteredMgrs = false

    if (this.feature.geometry.type === 'Point') {
      this.longitude = this.feature.geometry.coordinates[0]
      this.latitude = this.feature.geometry.coordinates[1]
      this.longitudeDms = DMS.longitudeDMSString(this.feature.geometry.coordinates[0])
      this.latitudeDms = DMS.latitudeDMSString(this.feature.geometry.coordinates[1])
      this.previousLatitudeValue = this.latitudeDms
      this.previousLongitudeValue = this.longitudeDms
    } else if (this.feature.geometry.type === 'Polygon') {
      this.longitude = this.feature.geometry.coordinates[0][this.selectedVertexIndex][0]
      this.latitude = this.feature.geometry.coordinates[0][this.selectedVertexIndex][1]
      this.longitudeDms = DMS.longitudeDMSString(this.feature.geometry.coordinates[0][this.selectedVertexIndex][0])
      this.latitudeDms = DMS.latitudeDMSString(this.feature.geometry.coordinates[0][this.selectedVertexIndex][1])
      this.previousLatitudeValue = this.latitudeDms
      this.previousLongitudeValue = this.longitudeDms
    } else if (this.feature.geometry.type === 'LineString') {
      this.longitude = this.feature.geometry.coordinates[this.selectedVertexIndex][0]
      this.latitude = this.feature.geometry.coordinates[this.selectedVertexIndex][1]
      this.longitudeDms = DMS.longitudeDMSString(this.feature.geometry.coordinates[this.selectedVertexIndex][0])
      this.latitudeDms = DMS.latitudeDMSString(this.feature.geometry.coordinates[this.selectedVertexIndex][1])
      this.previousLatitudeValue = this.latitudeDms
      this.previousLongitudeValue = this.longitudeDms
    }
  }
}
