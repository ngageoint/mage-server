
export const ErrPermissionDenied = Symbol.for('MageError.PermissionDenied')
export const ErrInvalidInput = Symbol.for('MageError.InvalidInput')
export const ErrEntityNotFound = Symbol.for('MageError.EntityNotFound')
export const ErrInfrastructure = Symbol.for('MageError.Infrastructure')

export type PermissionDeniedError = MageError<typeof ErrPermissionDenied, PermissionDeniedErrorData>
export type InvalidInputError = MageError<typeof ErrInvalidInput, KeyPathError[]>
export type EntityNotFoundError = MageError<typeof ErrEntityNotFound, EntityNotFoundErrorData>
/**
 * An infrastructure error bubbles up from some adapter layer component, such
 * as a file system service or database driver.  These are typically errors
 * that do not occur as a result of a malformed client request or business
 * logic condition, but some unexpected event like a lost network connection
 * or disk failure.  From an external web client perspective, this would
 * translate to a 500 HTTP response code.
 */
export type InfrastructureError = MageError<typeof ErrInfrastructure>

export class MageError<Code extends symbol, Data = null> extends Error {
  constructor(public readonly code: Code, readonly data: Data, message?: string) {
    super(message ? message : Symbol.keyFor(code))
    this.name = Symbol.keyFor(code) || 'MageError'
  }
}

export interface PermissionDeniedErrorData {
  subject: string
  permission: string
  object: string | null
}

export interface EntityNotFoundErrorData {
  readonly entityType: string
  readonly entityId: any
}

export function permissionDenied(permission: string, subject: string, object?: string): PermissionDeniedError {
  const message = `${subject} does not have permission ${permission}` + (object ? ` on ${object}` : '')
  return new MageError(ErrPermissionDenied, { permission, subject, object: object || null }, message)
}

export function entityNotFound(entityId: any, entityType: string, message?: string): EntityNotFoundError {
  return new MageError(ErrEntityNotFound, { entityId, entityType }, message || `${entityType} not found: ${entityId}`)
}

export function invalidInput(summary?: string, ...errors: KeyPathError[]): InvalidInputError {
  const message = errors.reduce((message, keyPathError) => {
    let err = keyPathError[0]
    if (typeof err === 'object' && 'message' in err) {
      err = err.message
    }
    const keyPath = keyPathError.slice(1, keyPathError.length)
    return message + `\n  ${keyPath.join(' > ')}: ${err}`
  }, summary || 'invalid request')
  return new MageError(ErrInvalidInput, errors, message)
}

export function infrastructureError(why: string | Error): InfrastructureError {
  const message = String(why)
  return new MageError(ErrInfrastructure, null, message)
}

/**
 * The KeyPathError type is simply an array whose first element is an error
 * (string message or `Error` object, typically), and the remaining elements are
 * strings that represent the chain of JSON properties whose value the error
 * describes.
 */
export type KeyPathError = [any, ...string[]]
