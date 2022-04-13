

declare module 'geojson-validation' {

  import * as geojson from 'geojson'

  namespace GeoJSONValidation {

    export function define(type: geojson.GeoJsonTypes | 'Position', validationErrors: (x: any) => string[]): void
    export function isGeometryObject(x: any, trace?: false): x is geojson.Geometry
    export function isGeometryObject(x: any, trace: true): string[]
  }

  export = GeoJSONValidation
}