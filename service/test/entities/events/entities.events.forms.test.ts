import { expect } from 'chai'
import { AttachmentPresentationType, AttachmentMediaTypes, attachmentTypeIsValidForField, FormField, FormFieldType } from '../../../lib/entities/events/entities.events.forms'

describe('observations attachments', () => {

  describe('allowed attachments validation', () => {

    Object.values(AttachmentPresentationType).sort().forEach(allowedType => {

      const field: FormField = {
        id: 456,
        type: FormFieldType.Attachment,
        name: 'test1',
        title: 'Test 1',
        required: false,
        allowedAttachmentTypes: [ allowedType ],
      }

      AttachmentMediaTypes[allowedType].forEach(mimeType => {

        it(`allows ${mimeType} attachments when the form field allows ${allowedType}`, () => {

          expect(attachmentTypeIsValidForField(field, mimeType)).to.be.true
        })
      })

      const disallowedTypes = Object.values(AttachmentPresentationType).filter(x => x !== allowedType).sort()
      disallowedTypes.forEach(disallowedType => {
        const disallowedMimeTypes = AttachmentMediaTypes[disallowedType]
        disallowedMimeTypes.forEach(mimeType => {

          it(`does not allow ${mimeType} attachments when the field allows ${allowedType}`, () => {

            expect(attachmentTypeIsValidForField(field, mimeType)).to.be.false
          })
        })
      })

      it(`does not allow null or undefined when the form field allows ${allowedType}`, () => {

        expect(attachmentTypeIsValidForField(field, null)).to.be.false
        expect(attachmentTypeIsValidForField(field, undefined)).to.be.false
      })
    })

    describe('a field that allows all attachment media types', () => {

      const anyAttachmentField: FormField = {
        id: 123,
        name: 'anyMedia',
        title: 'Any Media',
        required: false,
        type: FormFieldType.Attachment,
        allowedAttachmentTypes: Object.values(AttachmentPresentationType)
      }
      const allMimeTypes = Object.values(AttachmentPresentationType)
        .map(mediaType => AttachmentMediaTypes[mediaType])
        .reduce((allMimeTypes, mediaMimeTypes) => allMimeTypes.concat(mediaMimeTypes), [])
      allMimeTypes.forEach(mimeType => {

        it(`allows ${mimeType} attachments`, () => {

          expect(attachmentTypeIsValidForField(anyAttachmentField, mimeType))
        })
      })
    })
  })
})