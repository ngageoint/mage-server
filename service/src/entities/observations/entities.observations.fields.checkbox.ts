import { SimpleFieldValidation } from './entities.observations.fields'

function isBoolean(value: any): value is boolean {
  return toString.call(value) === '[object Boolean]'
}

export const CheckboxFieldValidation: SimpleFieldValidation = function CheckboxFieldValidation(field, value, result) {
  if (isBoolean(value)) {
    return result.succeeded()
  }
  if (!value) {
    return result.succeeded()
  }
  return result.failedBecauseTheEntry('must be a boolean')
}
