
import mongoose, { Document } from 'mongoose'

export const DELETE_KEY: '4b3e8386-3951-11ea-ab3f-83a298287f14' = '4b3e8386-3951-11ea-ab3f-83a298287f14'

export type ParseEntityTransform = {
  [K: string]: any | typeof DELETE_KEY
}

/**
 * Create a (fake) persisted Mongoose document from the given value object.
 * If the value object has an `id` entry, that entry's value will become the
 * `_id` entry's value in the resulting entity object.  Otherwise, the created
 * entity will have an `_id` entry with a generated Mongo Object ID.
 *
 * @param m the Mongoose `Model` constructor
 * @param x the value object
 */
export function parseEntity<V extends any, D extends Document>(m: {new(x: V): D}, x: V, transform?: ParseEntityTransform): D {
  const persisted: any = Object.assign({}, x)
  let id = x.id
  delete persisted.id
  if (typeof id === 'string') {
    try {
      id = mongoose.Types.ObjectId(id)
    }
    catch (e) {
      // ¯\_(ツ)_/¯
    }
  }
  if (!id) {
    id = mongoose.Types.ObjectId()
  }
  if (transform) {
    for (const key in Object.keys(transform)) {
      if (transform[key] === DELETE_KEY) {
        delete persisted[key]
      }
      else {
        persisted[key] = transform[key]
      }
    }
  }
  persisted._id = id
  return new m(persisted)
}