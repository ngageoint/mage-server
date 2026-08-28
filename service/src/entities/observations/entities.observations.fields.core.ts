import { FormField } from '../events/entities.events.forms'
import {
  Attachment,
  FieldConstraintKey, FieldValidationResult, FormEntry, FormEntryId,
  FormFieldEntry, ObservationAttrs
} from './entities.observations.types'

export const fieldValidation = {
  passed(normalizedEntry: FormFieldEntry | undefined = undefined): FieldValidationResult {
    return { valid: 'pass', invalid: false, normalizedEntry }
  },
  resolved(normalizedEntry: FormFieldEntry | undefined = undefined): FieldValidationResult {
    return { valid: 'resolved', invalid: false, normalizedEntry }
  },
  failedBecauseTheEntry(reason: string, constraint: FieldConstraintKey): FieldValidationResult {
    return { valid: false, invalid: true, failedBecauseTheEntry: reason, failedConstraint: constraint }
  }
}

export function attachmentsForField(field: FormField | string, formEntry: FormEntry | FormEntryId, observationAttrs: ObservationAttrs): Attachment[] {
  const fieldName = typeof field === 'object' ? field.name : field
  const formEntryId = typeof formEntry === 'object' && 'id' in formEntry && 'formId' in formEntry ? formEntry.id : formEntry
  return observationAttrs.attachments.filter(x => x.fieldName === fieldName && x.observationFormId === formEntryId)
}
