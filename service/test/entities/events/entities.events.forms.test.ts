import { expect } from 'chai'
import { AttachmentPresentationType, AttachmentMediaTypes, attachmentTypeIsValidForField, FormField, FormFieldType, BaseFormStyle, copyBaseFormStyle } from '../../../lib/entities/events/entities.events.forms'

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

          expect(attachmentTypeIsValidForField(anyAttachmentField, mimeType)).to.be.true
        })
      })
    })
  })
})

describe('copying form styles', function() {

  it('stops at variant field depth', function() {

    const tooDeep = {
      fill: '#001122',
      fillOpacity: 1.0,
      stroke: '#aabbcc',
      strokeOpacity: 0.4,
      strokeWidth: 1.2,
      primaryEntry1: {
        fill: '#001133',
        variantEntry1: {
          fill: '#002233',
          fillOpacity: 0.7,
          tooDeep: {
            ignore: 'me',
            stroke: '#123456'
          }
        }
      },
      primaryEntry2: {
        fill: '#111133',
        variantEntry1: {
          fillOpacity: 0.0,
          tooDeep: {
            never: 'copy'
          }
        },
        variantEntry2: {
          fillOpacity: 0.6,
          fill: '#112130'
        }
      }
    }
    const copy = copyBaseFormStyle(tooDeep as any)

    expect(copy).to.deep.equal({
      fill: '#001122',
      fillOpacity: 1.0,
      stroke: '#aabbcc',
      strokeOpacity: 0.4,
      strokeWidth: 1.2,
      primaryEntry1: {
        fill: '#001133',
        variantEntry1: {
          fill: '#002233',
          fillOpacity: 0.7,
        }
      },
      primaryEntry2: {
        fill: '#111133',
        variantEntry1: {
          fillOpacity: 0.0,
        },
        variantEntry2: {
          fillOpacity: 0.6,
          fill: '#112130'
        }
      }
    })
  })
})