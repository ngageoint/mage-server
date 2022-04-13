import { SimpleFieldValidation } from './entities.observations.fields'
import { TextFieldValidation } from './entities.observations.fields.text'

const emailRegex = /^[^\s@]+@[^\s@]+\./

export const EmailFieldValidation: SimpleFieldValidation = function(field, fieldEntry, result) {
  const isNotText = TextFieldValidation<string, false>(field, fieldEntry, { succeeded: () => false, failedBecauseTheEntry: reason => reason })
  if (isNotText) {
    return result.failedBecauseTheEntry(isNotText)
  }
  if (!fieldEntry) {
    return result.succeeded()
  }
  if (typeof fieldEntry === 'string' && emailRegex.test(fieldEntry)) {
    return result.succeeded()
  }
  return result.failedBecauseTheEntry('must be a valid email address')
}
