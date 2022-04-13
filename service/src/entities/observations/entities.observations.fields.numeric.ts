import { FieldConstraintKey } from './entities.observations'
import { SimpleFieldValidation } from './entities.observations.fields'


export const NumericFieldValidation: SimpleFieldValidation = function NumericFieldValidation(field, fieldEntry, result) {
  if (fieldEntry === null || fieldEntry === undefined) {
    return result.succeeded()
  }
  if (!isNumber(fieldEntry)) {
    return result.failedBecauseTheEntry('must be a number')
  }
  if (isNumber(field.min) && fieldEntry < field.min) {
    return result.failedBecauseTheEntry(`must be greater than or equal to ${field.min}`, FieldConstraintKey.Min)
  }
  if (isNumber(field.max) && fieldEntry > field.max) {
    return result.failedBecauseTheEntry(`must be less than or equal to ${field.max}`, FieldConstraintKey.Max)
  }
  return result.succeeded()
}

function isNumber(value: any): value is number {
  return toString.call(value) === '[object Number]';
}
