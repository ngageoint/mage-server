import kinks from '@turf/kinks'
import * as geojson from 'geojson'
/*
TODO: maybe consider using @turf/invariant or @mapbox/geojsonhint. this
package is a singleton object so any custom validations added are for every
consumer of the module in the node process.
*/
import geoJsonValidator from 'geojson-validation'
import { fieldValidation } from './entities.observations.fields.core'
import {
  FieldConstraintKeys,
  FieldValidationResult, FormFieldEntry
} from './entities.observations.types'

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
  return Object.hasOwn(validGeometryTypes, type)
}

/*
TODO: works for point geometry but do we need to check all the coordinates for
other geometry types?  also be aware that this defined validation overwrites
any other validation for the position type because the module operates as a
singleton.
*/
geoJsonValidator.define('Position', function (position: any[]) {
  const errors = []
  if (position[0] < -180 || position[0] > 180) {
    errors.push('longitude must be between -180 and 180')
  }
  if (position[1] < -90 || position[1] > 90) {
    errors.push('latitude must be between -90 and 90')
  }
  return errors
})

export function validateGeometryFieldType(entry: FormFieldEntry | undefined): FieldValidationResult {
  if (!isValidGeometryType(entry)) {
    return fieldValidation.failed(`The entry must be a GeoJSON geometry of type ${Object.keys(validGeometryTypes).join(', ')}.`, FieldConstraintKeys.Value)
  }
  if (!geoJsonValidator.isGeometryObject(entry)) {
    return fieldValidation.failed('The entry must be a valid GeoJSON geometry object.', FieldConstraintKeys.Value)
  }
  /*
  TODO: multi-polygons? if not, validate type is actually a supported type
  */
  if (entry.type === 'Polygon') {
    const foundKinks = kinks(entry as geojson.Polygon)
    if (foundKinks.features.length > 0) {
      return fieldValidation.failed('The entry is a polygon that intersects itself.', FieldConstraintKeys.Value)
    }
  }
  return fieldValidation.passed()
}
