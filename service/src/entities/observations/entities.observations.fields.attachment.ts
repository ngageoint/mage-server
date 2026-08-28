import { attachmentTypeIsValidForField, FormField } from '../events/entities.events.forms'
import { attachmentsForField, fieldValidation } from './entities.observations.fields.core'
import {
  FieldConstraintKeys, FieldValidationResult,
  FormEntryId,
  ObservationAttrs
} from './entities.observations.types'


export function validateAttachmentsForField(field: FormField, formEntryId: FormEntryId, observationAttrs: ObservationAttrs): FieldValidationResult {
  const attachments = attachmentsForField(field, formEntryId, observationAttrs)
  if (typeof field.min === 'number' && attachments.length < field.min) {
    return fieldValidation.failedBecauseTheEntry(`requires at least ${field.min} ${field.min > 1 ? 'attachments' : 'attachment'}`, FieldConstraintKeys.Min)
  }
  if (typeof field.max === 'number' && attachments.length > field.max) {
    return fieldValidation.failedBecauseTheEntry(`allows at most ${field.max} ${field.max > 1 ? 'attachments' : 'attachment'}`, FieldConstraintKeys.Max)
  }

  // TODO: ensure new attachment content types
  // TODO: attachmentTypeIsValidForField() should probably just move here
  // TODO: invalidate if form entry has a value?

  if (attachments.some(x => !attachmentTypeIsValidForField(field, x.contentType))) {
    return fieldValidation.failedBecauseTheEntry(`allows only content of type ${field.allowedAttachmentTypes?.join(', ')}`, FieldConstraintKeys.Value)
  }
  return fieldValidation.resolved()
}
