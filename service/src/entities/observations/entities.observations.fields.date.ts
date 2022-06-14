import { SimpleFieldValidation } from './entities.observations.fields'
import moment from 'moment'


export const DateFieldValidation: SimpleFieldValidation = function DateFieldValidation(field, value, result) {
  if (!value) {
    return result.succeeded()
  }
  if (typeof value === 'string' || value instanceof Date) {
    const date = moment(value, moment.ISO_8601, true)
    if (date.isValid()) {
      return result.succeeded(date.toDate())
    }
  }
  return result.failedBecauseTheEntry(`must be an ISO-8601 date string, e.g., ${new Date().toISOString()}`)
}
