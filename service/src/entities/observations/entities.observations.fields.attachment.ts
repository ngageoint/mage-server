import { attachmentTypeIsValidForField, FormField } from '../events/entities.events.forms'
import { attachmentsForField, FieldConstraintKey, FormEntryId, ObservationAttrs } from './entities.observations'
import { SimpleFieldValidationResult } from './entities.observations.fields'


export const AttachmentFieldValidation = function AttachmentFieldValidation<Failed, Succeeded>(field: FormField, formEntryId: FormEntryId, observationAttrs: ObservationAttrs, result: SimpleFieldValidationResult<Failed, Succeeded>): Failed | Succeeded {
  const attachments = attachmentsForField(field, formEntryId, observationAttrs)
  if (typeof field.min === 'number' && attachments.length < field.min) {
    return result.failedBecauseTheEntry(`requires at least ${field.min} ${field.min > 1 ? 'attachments' : 'attachment'}`, FieldConstraintKey.Min)
  }
  if (typeof field.max === 'number' && attachments.length > field.max) {
    return result.failedBecauseTheEntry(`allows at most ${field.max} ${field.max > 1 ? 'attachments' : 'attachment'}`, FieldConstraintKey.Max)
  }

  // TODO: ensure new attachment content types
  // TODO: attachmentTypeIsValidForField() should probably just move here
  // TODO: invalidate if form entry has a value?

  if (attachments.some(x => !attachmentTypeIsValidForField(field, x.contentType))) {
    return result.failedBecauseTheEntry(`allows only content of type ${field.allowedAttachmentTypes?.join(', ')}`)
  }
  return result.succeeded()
}
