import { Component, Directive, EventEmitter, Inject, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, NgModel, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms'
import { MatSnackBar } from '@angular/material/snack-bar'
import mgrs from 'mgrs'
import { Dimension, DimensionKey, DMSCoordinate, DMSParseError } from 'src/app/geometry/geometry-dms'
import * as DMS from 'src/app/geometry/geometry-dms'
import { GeometryService, LocalStorageService, MapService } from 'src/app/upgrade/ajs-upgraded-providers'
import { createMask } from '@ngneat/input-mask'

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
  selector: '[dmsValidation][formControlName],[dmsValidation][formControl],[dmsValidation][ngModel]',
  providers: [{ provide: NG_VALIDATORS, useExisting: DMSValidatorDirective, multi: true }]
})
export class DMSValidatorDirective implements Validator {

  @Input()
  dmsValidation: 'latitude' | 'longitude'

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.dmsValidation === 'latitude' && DMS.validateLatitude(control.value)) {
      return null
    } else if (this.dmsValidation === 'longitude' && DMS.validateLongitude(control.value)) {
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

type CoordinateSystemKey = 'wgs84' | 'mgrs' | 'dms'

@Component({
  selector: 'observation-edit-geometry-form',
  templateUrl: './observation-edit-geometry-form.component.html',
  styleUrls: ['./observation-edit-geometry-form.component.scss'],
  providers: [
    { provide: NG_VALIDATORS,  useExisting: MGRSValidatorDirective, multi: true },
    { provide: NG_VALIDATORS, useExisting: DMSValidatorDirective, multi: true }
  ]
})
export class ObservationEditGeometryFormComponent implements OnChanges, OnInit {

  @Input() feature: any
  @Output() save = new EventEmitter<any>()
  @Output() cancel = new EventEmitter<any>()

  @ViewChild('mgrsModel') mgrsModel: NgModel;
  @ViewChild('snackbarContainer', { read: ViewContainerRef }) snackBarContainer: ViewContainerRef;

  selectedShapeType = 'Point'
  coordinateSystem = 'wgs84'
  coordinateEditSource: CoordinateSystemKey | null = null
  selectedVertexIndex: number
  featureEdit: any
  latitude: number
  longitude: number
  mgrs: string
  readonly DMSDimensionKey = DimensionKey
  readonly dmsForm = new FormGroup({
    [DimensionKey.Latitude]: new FormControl(''),
    [DimensionKey.Longitude]: new FormControl(''),
  })
  readonly dmsLatMask = createMask({
    mask: `99° 99' 99" (N|S)`,
  })
  readonly dmsLonMask = createMask({
    mask: `999° 99' 99" (E|W)`,
  })

  constructor(
    @Inject(MapService) private mapService: any,
    @Inject(GeometryService) private geometryService: any,
    @Inject(LocalStorageService) private localStorageService: any,
    private snackBar: MatSnackBar)
  {
    this.coordinateSystem = this.localStorageService.getCoordinateSystemEdit()
  }

  ngOnInit(): void {
    this.dmsForm.valueChanges.subscribe(dms => {
      if (this.feature?.geometry?.coordinates) {
        this.onDmsChange(dms)
      }
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.feature) {
      this.feature = { ...this.feature }
      this.featureEdit = this.mapService.createFeature(this.feature, {
        geometryChanged: geometry => {
          this.geometryChanged(geometry)
        },
        vertexClick: vertex => {
          this.vertexClick(vertex)
        }
      });
      this.selectedVertexIndex = 0;
      this.updateCoordinates()
    }
    if (this.feature?.geometry?.coordinates) {
      this.dmsForm.enable()
    }
    else {
      this.dmsForm.disable()
    }
  }

  geometryChanged(geometry): void {
    this.feature.geometry = geometry;
    this.updateCoordinates()
  }

  vertexClick(vertex): void {
    this.selectedVertexIndex = vertex.index;
    this.updateCoordinates()
  }

  onSave(): void {
    if (this.feature.geometry.type) {
      if (this.geometryService.featureHasIntersections(this.feature)) {
        this.snackBar.open('Invalid geometry, polygons cannot intersect.', null, {
          duration: 2000
        })
        return
      }
      this.featureEdit.save()
      this.save.emit({ feature: this.feature })
    } else {
      this.mapService.removeFeatureFromLayer({ id: this.feature.id }, 'observations')
      this.featureEdit.cancel()
      this.save.emit({})
    }
  }

  onCancel(): void {
    this.featureEdit.cancel()
    this.cancel.emit()
  }

  coordinateSystemChange(coordinateSystem: CoordinateSystemKey): void {
    this.localStorageService.setCoordinateSystemEdit(coordinateSystem)
    this.coordinateSystem = coordinateSystem
    if (coordinateSystem === 'mgrs') {
      this.mgrs = this.toMgrs(this.feature)
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

  onDmsPaste(event: ClipboardEvent, dimension: DimensionKey): void {
    // TODO: make single coordinate paste use the dms parser to ensure properly
    // parsing leading hemisphere, compact dms, and decimals the same way
    // 0° 44'48"N 0° 00'48"E
    const pasted = event.clipboardData.getData('text')
    const parse = DMS.generateParsedCoordinates(pasted)
    let parsing = parse.next()
    const coords = [] as (DMSCoordinate | number)[]
    while (parsing.done === false && coords.length < 2) {
      coords.push(parsing.value)
      parsing = parse.next()
    }
    if (parsing.value instanceof DMSParseError) {
      console.error('error parsing pasted coordinates', parsing.value)
      this.snackBar.open(`Invalid DMS coordinate string: ${parsing.value.message}`, null, { duration: 6000 })
      return
    }
    if (coords.length === 0) {
      this.snackBar.open(`No DMS coordinates found in pasted text.`, null, { duration: 2000 })
      return
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    const formValue = { ...this.dmsForm.value }
    if (coords.length === 1) {
      const coord = typeof coords[0] === 'number' ? DMSCoordinate.fromDecimalDegrees(coords[0], dimension) : coords[0]
      formValue[dimension] = coord.format()
      this.dmsForm.setValue(formValue, { emitEvent: true })
      return
    }
    const [ first, second ] = coords.sort((a, b) => a instanceof DMSCoordinate ? -1 : (typeof b === 'number' ? 0 : 1))
    if (typeof first === 'number') {
      // must both be numbers - assume latitude first
      const latDMS = DMSCoordinate.fromDecimalDegrees(first, DimensionKey.Latitude)
      const lonDMS = DMSCoordinate.fromDecimalDegrees(second as number, DimensionKey.Longitude)
      formValue[DimensionKey.Latitude] = latDMS.format()
      formValue[DimensionKey.Longitude] = lonDMS.format()
      this.dmsForm.setValue(formValue, { emitEvent: true })
      return
    }
    const firstDim = Dimension.keyForHemisphere(first.hemisphere)
    // use the known hemisphere to infer the other if necessary
    const secondResolved = typeof second === 'number' ?
      DMSCoordinate.fromDecimalDegrees(second, firstDim === DimensionKey.Latitude ? DimensionKey.Longitude : DimensionKey.Latitude) :
      second
    const secondDim = Dimension.keyForHemisphere(secondResolved.hemisphere)
    this.dmsForm.setValue({ [firstDim]: first.format(), [secondDim]: secondResolved.format() }, { emitEvent: true })
  }

  onDmsChange({ lat: formLat, lon: formLon }): void {
    if (this.dmsForm.invalid) {
      return
    }
    const lat = formLat ? DMS.parseOne(formLat, DimensionKey.Latitude) : this.dmsForm.value[DimensionKey.Latitude]
    const lon = formLon ? DMS.parseOne(formLon, DimensionKey.Longitude) : this.dmsForm.value[DimensionKey.Longitude]
    this.editCurrentCoordinates('dms', lat, lon)
  }

  onLatLngChange(): void {
    this.editCurrentCoordinates('wgs84', this.latitude, this.longitude)
  }

  onMgrsChange(): void {
    if (this.mgrsModel.control.invalid) {
      return
    }
    const [ lon, lat ] = mgrs.toPoint(this.mgrs)
    this.editCurrentCoordinates('mgrs', lat, lon)
  }

  hasIntersections(feature, coordinates): boolean {
    if (feature.geometry.type !== 'Point') {
      return this.geometryService.featureHasIntersections({ geometry: { coordinates } })
    }
    return false;
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
        this.dmsForm.setValue({ [DimensionKey.Latitude]: '', [DimensionKey.Longitude]: '' }, { emitEvent: false })
        delete this.feature.geometry.type
        this.featureEdit.cancel()
        break;
    }
    if (shapeType) {
      this.onEditShape()
    }
  }

  onEditShape(): void {
    this.featureEdit.update(this.feature)
  }

  editCurrentCoordinates(from: CoordinateSystemKey, lat: number, lon: number): void {
    this.coordinateEditSource = from
    let coordinates = [ ...this.feature.geometry.coordinates ]
    if (this.feature.geometry.type === 'Point') {
      coordinates = [ lon, lat ]
    }
    else if (this.feature.geometry.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = [ lon, lat ]
    }
    else if (this.feature.geometry.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = [ lon, lat ]
      }
    }
    ensurePolygonClosed(this.feature, coordinates)
    if (this.hasIntersections(this.feature, coordinates)) {
      return
    }
    this.feature.geometry.coordinates = coordinates
    this.featureEdit.update(this.feature)
  }

  updateCoordinates(): void {
    if (this.feature.geometry.type === 'Point') {
      this.longitude = this.feature.geometry.coordinates[0]
      this.latitude = this.feature.geometry.coordinates[1]
    }
    else if (this.feature.geometry.type === 'Polygon') {
      this.longitude = this.feature.geometry.coordinates[0][this.selectedVertexIndex][0]
      this.latitude = this.feature.geometry.coordinates[0][this.selectedVertexIndex][1]
    }
    else if (this.feature.geometry.type === 'LineString') {
      this.longitude = this.feature.geometry.coordinates[this.selectedVertexIndex][0]
      this.latitude = this.feature.geometry.coordinates[this.selectedVertexIndex][1]
    }
    const from = this.coordinateEditSource
    this.coordinateEditSource = null
    if (from !== 'mgrs') {
      this.mgrs = this.toMgrs(this.feature)
      this.mgrsModel.control.setValue(this.mgrs, {emitEvent:false, emitViewToModelChange:false, emitModelToViewChange:true})
    }
    if (from !== 'dms') {
      this.dmsForm.setValue({
        [DimensionKey.Latitude]: DMS.formatLatitude(this.latitude),
        [DimensionKey.Longitude]: DMS.formatLongitude(this.longitude)
      }, { emitEvent: false })
    }
  }
}

function ensurePolygonClosed(feature, coordinates) {
  // Ensure first and last points are the same for polygon
  if (feature.geometry.type === 'Polygon') {
    if (feature.editedVertex === 0) {
      coordinates[0][coordinates[0].length - 1] = [ ...coordinates[0][0] ]
    }
    else if (feature.editedVertex === coordinates[0].length - 1) {
      coordinates[0][0] = [ ...coordinates[0][coordinates[0].length - 1] ]
    }
  }
}
