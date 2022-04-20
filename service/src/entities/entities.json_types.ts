
export type JsonPrimitive =
  | null
  | boolean
  | number
  | string

export type Json =
  | JsonPrimitive
  | JsonObject
  | Json[]

export type JsonObject = { [prop: string]: Json | undefined }

/**
 * This mapped type ensures the target type is JSON-compatible.  If so, this
 * type maps to the given target type.  If not, this type maps to `never`.
 * This type enforces JSON compatibility on strongly typed interfaces with
 * strict keys because this does not use a dynamic index signature that would
 * allow any key to be present in the target type, like {@link JsonObject}
 * uses.  To use this type, created a class or function with a generic
 * parameter for the target type, and substitute `EnsureJson<TargetType>` for
 * references to `TargetType`.  For example,
 * ```
 * class Job<T> {
 *   execute(): Promise<EnsureJson<T>>
 *   chain(from: EnsureJson<T>): Job<EnsureJson<T>>
 * }
 * ```
 */
export type EnsureJson<T> =
  T extends Function ? never
  : T extends JsonPrimitive ? T
  : T extends (infer E)[] ? EnsureJson<E>[]
  : keyof T extends string | number
  ? T extends { [K in keyof T]: EnsureJson<T[K]> } ? T
  : never
  : never

// sourced from https://github.com/microsoft/TypeScript/issues/1897#issuecomment-580962081
export type JsonCompatible<T> = {
  [P in keyof T]: T[P] extends Json
    ? T[P]
    : Pick<T, P> extends Required<Pick<T, P>>
    ? never
    : T[P] extends (() => any) | undefined
    ? never
    : JsonCompatible<T[P]>;
};

export { JSONSchema4 } from 'json-schema'

import { JSONSchema4 } from 'json-schema'

export interface JsonValidator {
  validate(instance: Json): Promise<null | Error>
}

export interface JsonSchemaService {
  /**
   * Validate the given JSON Schema and resolve an object that is essentially
   * a compiled, cacheable version of the schema that can validate JSON
   * instances.
   * @param schema the JSON Schema to validate and compile
   */
  validateSchema(schema: JSONSchema4): Promise<JsonValidator>
}
