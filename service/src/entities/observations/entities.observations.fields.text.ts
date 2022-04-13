import { SimpleFieldValidation } from './entities.observations.fields'

export const TextFieldValidation: SimpleFieldValidation = function TextFieldValidatin(field, fieldEntry, result) {
  if (!fieldEntry) {
    // TODO: this succeeds when the value is an empty string. is that what we want?
    return result.succeeded()
  }
  return isString(fieldEntry) ? result.succeeded() : result.failedBecauseTheEntry('must be a string')
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}