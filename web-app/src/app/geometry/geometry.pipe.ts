import { Pipe, PipeTransform } from '@angular/core'
import * as turfCenter from '@turf/center'
import { Feature, Point } from 'geojson'
import * as mgrs from 'mgrs'
import * as DMS from './geometry-dms'
import { LocalStorageService } from '../http/local-storage.service'

@Pipe({
  name: 'geometry'
})
export class GeometryPipe implements PipeTransform {

  constructor(private localStorageService: LocalStorageService) { }

  transform(value: any, format?: number): any {
    if (value === undefined) return

    switch (this.localStorageService.getCoordinateSystemView()) {
      case 'mgrs':
        return this.toMgrs(value)
      case 'dms':
        return this.toDms(value)
      default:
        return this.toWgs84(value, format)
    }
  }

  toMgrs(value: any): string {
    const coordinates = this.center(value).coordinates
    return mgrs.forward(coordinates)
  }

  toDms(value: any): string {
    const coordinates = this.center(value).coordinates
    return `${DMS.formatLatitude(coordinates[1])}, ${DMS.formatLongitude(coordinates[0])}`
  }

  toWgs84(value: any, format: number): string {
    const coordinates = this.center(value).coordinates
    return coordinates[1].toFixed(format) + ', ' + coordinates[0].toFixed(format)
  }

  center(value: any): Point {
    const feature: Feature = {
      type: 'Feature',
      properties: {},
      geometry: value
    }

    return turfCenter(feature).geometry as Point
  }
}
