import mongoose from 'mongoose'

/**
 * Mongoose documents and this plugin's own attrs interfaces don't share a
 * type - `toJSON()` is the standard way to get a plain object out, but it
 * always comes back untyped. This is that one cast, named, so it's not
 * repeated at every call site across the plugin's Mongoose adapters.
 */
export function toAttrs<T>(document: mongoose.Document): T {
  return document.toJSON() as unknown as T
}
