import { FormField } from '../events/entities.events.forms'
import {
  validateFieldTypeConstraint,
} from './entities.observations.fields.constraints'
import { FieldValidationResult, FormFieldEntry } from './entities.observations.types'

export function validateFieldEntry(entry: FormFieldEntry, field: FormField): FieldValidationResult {
  return validateFieldTypeConstraint[field.type](entry, field)
}
