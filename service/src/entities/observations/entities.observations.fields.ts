import { FormField } from '../events/entities.events.forms'
import {
  validateFieldTypeConstraint,
  validateUserFieldConstraint,
} from './entities.observations.fields.constraints'
import { FieldValidationResult, FormFieldEntry } from './entities.observations.types'

export function validateFieldEntry(entry: FormFieldEntry, field: FormField): FieldValidationResult {
  return validateFieldTypeConstraint[field.type](entry, field)
}

export function validateUserFieldEntry(entry: FormFieldEntry, field: FormField): FieldValidationResult {
  return validateUserFieldConstraint(entry, field)
}
