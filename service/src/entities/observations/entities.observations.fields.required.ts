import { FieldConstraintKey } from './entities.observations'
import { SimpleFieldValidation } from './entities.observations.fields'

export const RequiredFieldValidation: SimpleFieldValidation = function RequiredFieldValidation(field, fieldEntry, result) {
  if (field.required) {
    if (fieldEntry === null || fieldEntry === undefined || fieldEntry === '') {
      return result.failedBecauseTheEntry('is required', FieldConstraintKey.Required)
    }
  }
  return result.succeeded()
}
