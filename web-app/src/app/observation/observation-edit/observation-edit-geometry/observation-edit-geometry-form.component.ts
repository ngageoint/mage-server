import { Component, Directive, EventEmitter, inject, input, OnInit, Output, signal, viewChild } from '@angular/core'
import { AbstractControl, FormControl, FormGroup, FormsModule, NgModel, NG_VALIDATORS, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms'
import { InputMaskModule } from '@ngneat/input-mask'
import { MatButtonModule } from '@angular/material/button'
import { MatChipsModule } from '@angular/material/chips'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSnackBar as MatSnackBar } from '@angular/material/snack-bar'
import mgrs from 'mgrs'
import { Dimension, DimensionKey, DMSCoordinate, DMSParseError } from 'src/app/geometry/geometry-dms'
import * as DMS from 'src/app/geometry/geometry-dms'
import { createMask } from '@ngneat/input-mask'
import { LocalStorageService } from '../../../http/local-storage.service'
import { MapService, FeatureEdit } from '../../../map/map.service'
import { GeometryService } from '../../../geometry/geometry.service'

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

  dmsValidation = input<'latitude' | 'longitude'>()

  validate(control: AbstractControl): ValidationErrors | null {
    if (this.dmsValidation() === 'latitude' && DMS.validateLatitude(control.value)) {
      return null
    } else if (this.dmsValidation() === 'longitude' && DMS.validateLongitude(control.value)) {
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
type DMSFormValue = Partial<{ [DimensionKey.Latitude]: string, [DimensionKey.Longitude]: string }>

@Component({
    selector: 'observation-edit-geometry-form',
    templateUrl: './observation-edit-geometry-form.component.html',
    styleUrls: ['./observation-edit-geometry-form.component.scss'],
    providers: [
        { provide: NG_VALIDATORS, useExisting: MGRSValidatorDirective, multi: true },
        { provide: NG_VALIDATORS, useExisting: DMSValidatorDirective, multi: true }
    ],
    imports: [FormsModule, ReactiveFormsModule, InputMaskModule, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule, MGRSValidatorDirective, DMSValidatorDirective]
})
export class ObservationEditGeometryFormComponent implements OnInit {
  private readonly mapService: MapService = inject(MapService)
  private readonly geometryService: GeometryService = inject(GeometryService)
  private readonly localStorageService: LocalStorageService = inject(LocalStorageService)
  private readonly snackBar: MatSnackBar = inject(MatSnackBar)

  @Output() save = new EventEmitter<any>()
  @Output() cancel = new EventEmitter<any>()

  mgrsModel = viewChild.required<NgModel>('mgrsModel')

  currentFeature = signal<any>(null)

  selectedShapeType = 'Point'
  coordinateSystem = 'wgs84'
  coordinateEditSource: CoordinateSystemKey | null = null
  selectedVertexIndex: number
  featureEdit?: FeatureEdit
  latitude = signal<number | null>(null)
  longitude = signal<number | null>(null)
  mgrs = signal<string | null>(null)
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

  constructor() {
    this.coordinateSystem = this.localStorageService.getCoordinateSystemEdit()
    this.dmsForm.disable({emitEvent: false})
  }

  startEdit(feature: any): void {
    const cloned = { ...feature }
    this.currentFeature.set(cloned)
    this.featureEdit = this.mapService.createFeature(cloned, {
      geometryChanged: geometry => {
        this.geometryChanged(geometry)
      },
      vertexClick: vertex => {
        this.vertexClick(vertex)
      }
    });
    this.selectedVertexIndex = 0;
    this.updateCoordinates()
    if (this.currentFeature()?.geometry?.coordinates) {
      this.dmsForm.enable({emitEvent: false})
    }
    else {
      this.dmsForm.disable({emitEvent: false})
    }
  }

  ngOnInit(): void {
    this.dmsForm.valueChanges.subscribe(dms => {
      if (this.currentFeature()?.geometry?.coordinates) {
        this.onDmsChange({ [DimensionKey.Latitude]: '', [DimensionKey.Longitude]: '', ...dms })
      }
    })
  }

  geometryChanged(geometry): void {
    const feature = this.currentFeature()
    feature.geometry = geometry;
    this.currentFeature.set({ ...feature })
    this.updateCoordinates()
  }

  vertexClick(vertex): void {
    this.selectedVertexIndex = vertex.index;
    this.updateCoordinates()
  }

  onSave(): void {
    const feature = this.currentFeature()
    if (feature.geometry.type) {
      if (this.geometryService.featureHasIntersections(feature)) {
        this.snackBar.open('Invalid geometry, polygons cannot intersect.', null, {
          duration: 2000
        })
        return
      }
      this.featureEdit?.save()
      this.save.emit({ feature })
    } else {
      this.mapService.removeFeatureFromLayer({ id: feature.id }, 'observations')
      this.featureEdit?.cancel()
      this.save.emit({})
    }
  }

  onCancel(): void {
    this.featureEdit?.cancel()
    this.cancel.emit()
  }

  coordinateSystemChange(coordinateSystem: CoordinateSystemKey): void {
    this.localStorageService.setCoordinateSystemEdit(coordinateSystem)
    this.coordinateSystem = coordinateSystem
    if (coordinateSystem === 'mgrs') {
      this.mgrs.set(this.toMgrs(this.currentFeature()))
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
    const formValue = { [DimensionKey.Latitude]: '', [DimensionKey.Longitude]: '', ...this.dmsForm.value }
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
    this.dmsForm.setValue({ [firstDim]: first.format(), [secondDim]: secondResolved.format() } as Required<DMSFormValue>, { emitEvent: true })
  }

  onDmsChange({ lat: formLat, lon: formLon }: Required<DMSFormValue>): void {
    if (this.dmsForm.invalid) {
      return
    }
    const lat = DMS.parseOne(formLat, DimensionKey.Latitude)
    const lon = DMS.parseOne(formLon, DimensionKey.Longitude)
    this.editCurrentCoordinates('dms', lat, lon)
  }

  onLatLngChange(): void {
    this.editCurrentCoordinates('wgs84', this.latitude(), this.longitude())
  }

  onMgrsChange(): void {
    if (this.mgrsModel().control.invalid) {
      return
    }
    const [ lon, lat ] = mgrs.toPoint(this.mgrs())
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
    const feature = this.currentFeature()
    switch (shapeType) {
      case 'Point':
        feature.geometry.coordinates = []
        feature.geometry.type = 'Point'
        break;
      case 'LineString':
        feature.geometry.coordinates = []
        feature.geometry.type = 'LineString'
        break;
      case 'Polygon':
        feature.geometry.coordinates = []
        feature.geometry.type = 'Polygon'
        break;
      default:
        this.latitude.set(null)
        this.longitude.set(null)
        this.mgrs.set(null)
        this.dmsForm.setValue({ [DimensionKey.Latitude]: '', [DimensionKey.Longitude]: '' }, { emitEvent: false })
        delete feature.geometry.type
        this.featureEdit?.cancel()
        break;
    }
    this.currentFeature.set({ ...feature })
    if (shapeType) {
      this.onEditShape()
    }
  }

  onEditShape(): void {
    this.featureEdit?.update(this.currentFeature())
  }

  editCurrentCoordinates(from: CoordinateSystemKey, lat: number, lon: number): void {
    this.coordinateEditSource = from
    const feature = this.currentFeature()
    let coordinates = [ ...feature.geometry.coordinates ]
    if (feature.geometry.type === 'Point') {
      coordinates = [ lon, lat ]
    }
    else if (feature.geometry.type === 'LineString') {
      coordinates[this.selectedVertexIndex] = [ lon, lat ]
    }
    else if (feature.geometry.type === 'Polygon') {
      if (coordinates[0]) {
        coordinates[0][this.selectedVertexIndex] = [ lon, lat ]
      }
    }
    ensurePolygonClosed(feature, coordinates)
    if (this.hasIntersections(feature, coordinates)) {
      return
    }
    feature.geometry.coordinates = coordinates
    this.currentFeature.set({ ...feature })
    this.featureEdit?.update(feature)
  }

  updateCoordinates(): void {
    const feature = this.currentFeature()
    if (feature.geometry.type === 'Point') {
      this.longitude.set(feature.geometry.coordinates[0])
      this.latitude.set(feature.geometry.coordinates[1])
    }
    else if (feature.geometry.type === 'Polygon') {
      this.longitude.set(feature.geometry.coordinates[0][this.selectedVertexIndex][0])
      this.latitude.set(feature.geometry.coordinates[0][this.selectedVertexIndex][1])
    }
    else if (feature.geometry.type === 'LineString') {
      this.longitude.set(feature.geometry.coordinates[this.selectedVertexIndex][0])
      this.latitude.set(feature.geometry.coordinates[this.selectedVertexIndex][1])
    }
    const from = this.coordinateEditSource
    this.coordinateEditSource = null
    if (from !== 'mgrs') {
      this.mgrs.set(this.toMgrs(feature))
      this.mgrsModel().control.setValue(this.mgrs(), {emitEvent:false, emitViewToModelChange:false, emitModelToViewChange:true})
    }
    if (from !== 'dms') {
      this.dmsForm.setValue({
        [DimensionKey.Latitude]: DMS.formatLatitude(this.latitude()),
        [DimensionKey.Longitude]: DMS.formatLongitude(this.longitude())
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
