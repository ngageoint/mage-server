import { FormField } from '../events/entities.events.forms'
import {
  Attachment,
  FieldConstraintKey, FieldValidationResult, FormEntry, FormEntryId,
  FormFieldEntry, ObservationAttrs
} from './entities.observations.types'

export const fieldValidation = {
  /**
   * Indicate a field entry is valid for the calling rule, and validation can proceed to the next rule.
   */
  passed(normalizedEntry: FormFieldEntry | undefined = undefined): FieldValidationResult {
    return { valid: 'pass', invalid: false, normalizedEntry }
  },
  /**
   * Indicate a field entry is valid for the calling rule and no further validation is necessary.
   */
  resolved(normalizedEntry: FormFieldEntry | undefined = undefined): FieldValidationResult {
    return { valid: 'resolved', invalid: false, normalizedEntry }
  },
  failed(reason: string, constraint: FieldConstraintKey): FieldValidationResult {
    return { valid: false, invalid: true, failedMessage: reason, failedConstraint: constraint }
  }
}

export function attachmentsForField(field: FormField | string, formEntry: FormEntry | FormEntryId, observationAttrs: ObservationAttrs): Attachment[] {
  const fieldName = typeof field === 'object' ? field.name : field
  const formEntryId = typeof formEntry === 'object' && 'id' in formEntry && 'formId' in formEntry ? formEntry.id : formEntry
  return observationAttrs.attachments.filter(x => x.fieldName === fieldName && x.observationFormId === formEntryId)
}
