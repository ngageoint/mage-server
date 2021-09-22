import { Pipe, PipeTransform, Inject } from '@angular/core'
import { LocalStorageService } from '../upgrade/ajs-upgraded-providers'
import * as turfCenter from '@turf/center'
import * as mgrs from 'mgrs'
import { Point, Feature } from 'geojson'

@Pipe({
  name: 'geometry'
})
export class GeometryPipe implements PipeTransform {

  constructor(@Inject(LocalStorageService) private localStorageService: any) { }

  transform(value: any, format?: number): any {
    if (value === undefined) return

    switch (this.localStorageService.getCoordinateSystemView()) {
      case 'mgrs':
        return this.toMgrs(value)
      default:
        return this.toWgs84(value, format)
    }
  }

  toMgrs(value: any): string {
    const coordinates = this.center(value).coordinates
    return mgrs.forward(coordinates)
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