import { SimpleFieldValidation } from './entities.observations.fields'
import kinks from '@turf/kinks'
/*
TODO: maybe consider using @turf/invariant or @mapbox/geojsonhint. this
package is a singleton object so any custom validations added are for every
consumer of the module in the node process.
*/
import geoJsonValidator from 'geojson-validation'
import * as geojson from 'geojson'

type ValidGeometries = geojson.Point | geojson.LineString | geojson.Polygon
type ValidGeometryTypes = ValidGeometries['type']
const validGeometryTypes: { [typeName in ValidGeometryTypes]: true } = {
  Point: true,
  LineString: true,
  Polygon: true,
}
function isValidGeometryType(x: any): boolean {
  x = x || {}
  const type = x.type
  return validGeometryTypes.hasOwnProperty(type)
}

/*
TODO: works for point geometry but do we need to check all the coordinates for
other geometry types?  also be aware that this defined validation overwrites
any other validation for the poisition type because the module operates as a
singleton.
*/
geoJsonValidator.define('Position', function(position: any[]) {
  const errors = [];
  if (position[0] < -180 || position[0] > 180) {
    errors.push('longitude must be between -180 and 180');
  }
  if (position[1] < -90 || position[1] > 90) {
    errors.push('latitude y must be between -90 and 90');
  }
  return errors;
})

export const GeometryFieldValidation: SimpleFieldValidation = function GeometryFieldValidation(field, fieldEntry, result) {
  if (!fieldEntry) {
    return result.succeeded()
  }
  if (!isValidGeometryType(fieldEntry)) {
    return result.failedBecauseTheEntry(`must be a GeoJSON geometry of type ${Object.keys(validGeometryTypes).join(', ')}.`)
  }
  if (!geoJsonValidator.isGeometryObject(fieldEntry)) {
    return result.failedBecauseTheEntry('must be a valid GeoJSON geometry object.')
  }
  /*
  TODO: multi-polygons? if not, validate type is actually a supported type
  */
  if (fieldEntry.type === 'Polygon') {
    const foundKinks = kinks(fieldEntry as geojson.Polygon)
    if (foundKinks.features.length > 0) {
      return result.failedBecauseTheEntry('must not be a polygon that intersects itself.')
    }
  }
  return result.succeeded()
}
