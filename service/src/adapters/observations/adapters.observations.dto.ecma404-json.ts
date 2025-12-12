import { BBox, Geometry } from 'geojson'
import moment from 'moment'
import { invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { ExoObservationMod } from '../../app.api/observations/app.api.observations'
import { Json } from '../../entities/entities.json_types'
import { ObservationId } from '../../entities/observations/entities.observations'

/*
 * NOTE: This file is named ecma404-json to avoid any potential problems with
 * resolving the module name at runtime, as Node supports resolving modules
 * with a .json extension.
 */

/**
 * Transform the given JSON, presumably from an external client, to a strongly
 * typed {@link ExoObservationMod} object for the application layer.  This performs
 * validation only on the primitive JSON keys and types present in the input,
 * but not any application or domain layer validation of the content.  This
 * function retains only known keys, i.e. those that `ExoObservationMod`
 * defines, and discards the rest from the result object.
 */
export function exoObservationModFromJson(json: Json): ExoObservationMod | InvalidInputError {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return invalidInput('Observation update must be a JSON object.')
  }
  if (typeof json.id !== 'string') {
    return invalidInput('Observation must have a string ID.', [ 'id' ])
  }
  const bbox = json.bbox
  if (bbox !== undefined && !Array.isArray(bbox)) {
    return invalidInput('BBox must be an array.', [ 'bbox' ])
  }
  if (typeof json?.geometry !== 'object' || Array.isArray(json.geometry) || json.geometry === null) {
    return invalidInput('Geometry must be an object.', [ 'geometry' ])
  }
  if (json.type !== undefined && json.type !== 'Feature') {
    return invalidInput('GeoJSON type must be \'Feature\'', [ 'type' ])
  }
  const properties = json.properties
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return invalidInput('Observation properties must be an object.', [ 'properties' ])
  }
  if (!properties.timestamp || typeof properties.timestamp !== 'string') {
    return invalidInput('Observation timestamp must be a string.', [ 'properties', 'timestamp' ])
  }
  const timestamp = moment(properties.timestamp, moment.ISO_8601, true)
  if (!timestamp.isValid()) {
    return invalidInput('Observation timestamp must be a valid ISO-8601 date.', [ 'properties', 'timestamp' ])
  }
  const mod: ExoObservationMod = {
    id: json.id,
    type: 'Feature',
    geometry: json.geometry as unknown as Geometry,
    properties: {
      ...properties as any,
      timestamp: timestamp.toDate()
    }
  }
  if (bbox) {
    mod.bbox = bbox as BBox
  }
  return mod
}