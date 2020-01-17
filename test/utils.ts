
import mongoose, { Document, Model } from 'mongoose';

/**
 * Create a (mocked) persisted Mongoose document from the given value object.
 * The value object is assumed to have an `id` entry which this operation
 * replaces with an `_id` key that persisted MongoDB documents typically have.
 * If the value object's `id` entry has a string value, the resulting document's
 * `_id` field will be a Mongoose `ObjectId`.
 * @param m the Mongoose `Model` constructor
 * @param x the value object
 */
export function parseEntity<V extends {id: any}, D extends Document>(m: {new(x: V): D}, x: V): D {
  const persisted: any = Object.assign({}, x);
  let id = x.id;
  delete persisted.id;
  if (typeof id === 'string') {
    id = mongoose.Types.ObjectId(id);
  }
  persisted._id = id;
  return new m(persisted);
}