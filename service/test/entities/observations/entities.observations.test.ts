import { addAttachment, Attachment, AttachmentNotFoundError, AttachmentPatchAttrs, AttachmentValidationErrorReason, copyObservationAttrs, FieldConstraintKey, FormEntry, AttachmentCreateAttrs, Observation, ObservationAttrs, patchAttachment, MinFormsConstraint, MaxFormsConstraint, validateObservation, AttachmentAddError, ObservationUpdateError, ObservationUpdateErrorReason, validationResultMessage, FormEntryValidationErrorReason, Thumbnail, putAttachmentThumbnailForMinDimension, copyThumbnailAttrs, removeAttachment, copyAttachmentAttrs, removeFormEntry, thumbnailIndexForTargetDimension, ObservationDomainEventType } from '../../../lib/entities/observations/entities.observations'
import { copyMageEventAttrs, MageEvent, MageEventAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { AttachmentPresentationType, AttachmentMediaTypes, Form, FormField, FormFieldChoice, FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import { expect } from 'chai'
import { Point } from 'geojson'
import _ from 'lodash'
import { PendingEntityId } from '../../../lib/entities/entities.global'
import uniqid from 'uniqid'

function makeObservationAttrs(mageEvent: MageEventAttrs | MageEventId): ObservationAttrs {
  const eventId = typeof mageEvent === 'object' ? mageEvent.id : mageEvent
  return {
    id: 'o1',
    eventId,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    lastModified: new Date(Date.now() - 1000 * 60 * 60),
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ 100, 40 ] },
    properties: {
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 - 1000 * 60 * 5),
      forms: []
    },
    states: [],
    favoriteUserIds: [],
    attachments: []
  }
}

describe('observation entities', function() {

  let mageEventAttrs: MageEventAttrs

  beforeEach(function() {
    mageEventAttrs = {
      id: 303,
      name: 'Observation Validation Test',
      forms: [
        {
          id: 100,
          name: 'Form 1',
          archived: false,
          color: 'blue',
          fields: [],
          userFields: [],
        }
      ],
      style: {},
      acl: {},
      feedIds: [],
      layerIds: [],
    }
  })

  describe('observation validation', function() {

    it('fails when the event id does not match the event', function() {

      const mageEvent = new MageEvent(mageEventAttrs)
      const o: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id + 1)
      const invalid = validateObservation(o, mageEvent)

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({
        eventId: `The observation event ID ${o.eventId} does not match the asserted event ID ${mageEventAttrs.id}.`
      })
    })

    it('fails if the timestamp is invalid', function() {

      const o = makeObservationAttrs(mageEventAttrs.id) as any // cheater
      o.properties.timestamp = null
      const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({ timestamp: `The observation requires a valid timestamp.` })
    })

    it('fails if the geojson type is not feature', function() {

      const mageEvent = new MageEvent(mageEventAttrs)
      const o = makeObservationAttrs(mageEventAttrs.id) as any // cheater
      o.type = 'FeatureCollection'
      let invalid = validateObservation(o, mageEvent)

      expect(invalid.hasErrors).to.be.true
      expect(Object.entries(invalid.coreAttrsErrors).length).to.equal(1)
      expect(invalid.coreAttrsErrors.type).to.equal(`The observation GeoJSON type must be 'Feature'.`)

      o.type = null
      invalid = validateObservation(o, mageEvent)

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({ type: `The observation GeoJSON type must be 'Feature'.` })
    })

    it('fails if the geojson geometry is invalid', function() {

      const mageEvent = new MageEvent(mageEventAttrs)
      const o = makeObservationAttrs(mageEventAttrs.id)
      o.geometry = {
        type: 'Pointy',
        coordinates: [ 100, 25 ]
      } as any // cheater
      let invalid = validateObservation(o, mageEvent)

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({ geometry: `The observation geometry must be a GeoJSON geometry of type Point, LineString, Polygon.` })

      o.geometry = {
        type: 'Point',
        coordinates: [ 181, 0 ]
      }
      invalid = validateObservation(o, mageEvent)

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({ geometry: `The observation geometry must be a valid GeoJSON geometry object.` })
    })

    it('fails if there is no forms array', function() {

      const o = makeObservationAttrs(mageEventAttrs.id) as any // cheater
      o.properties.forms = null
      const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

      expect(invalid.hasErrors).to.be.true
      expect(invalid.coreAttrsErrors).to.deep.equal({ forms: 'The observation requires an array of form entries.' })
    })

    describe('validating form entries', function() {

      it('fails when a form entry references an invalid form id', function() {

        const o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = [
          {
            id: 'badFormRef',
            formId: mageEventAttrs.forms[0].id - 10
          }
        ]
        const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.be.true
        expect(invalid.formEntryErrors.length).to.equal(1)
        const entryErr = new Map(invalid.formEntryErrors).get(0)!
        expect(entryErr.fieldErrors.size).to.equal(0)
        expect(entryErr.formEntryId).to.equal('badFormRef')
        expect(entryErr.formEntryPosition).to.equal(0)
        expect(entryErr.formName).to.be.null
        expect(Array.from(entryErr.entryLevelErrors)).to.have.members([ FormEntryValidationErrorReason.FormRef ])
      })

      it('fails when form entry ids are not unique on the observation', function() {

        const o = makeObservationAttrs(mageEventAttrs.id)
        mageEventAttrs.forms[0].fields = [
          {
            id: 1,
            name: 'field1',
            title: 'Field 1',
            required: false,
            type: FormFieldType.Text
          }
        ]
        o.properties.forms = [
          {
            id: 'dup id',
            formId: mageEventAttrs.forms[0].id
          },
          {
            id: 'dup id',
            formId: mageEventAttrs.forms[0].id,
            field1: 'not unique'
          },
          {
            id: 'unique',
            formId: mageEventAttrs.forms[0].id,
            field1: 'this is fine'
          },
          {
            id: 'dup id',
            formId: mageEventAttrs.forms[0].id,
            field1: 'also not unique'
          }
        ]
        const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.be.true
        expect(invalid.formEntryErrors.length).to.equal(2)
        const errs = new Map(invalid.formEntryErrors)
        let entryErr = errs.get(1)!
        expect(entryErr.fieldErrors.size).to.equal(0)
        expect(entryErr.formEntryId).to.equal('dup id')
        expect(entryErr.formEntryPosition).to.equal(1)
        expect(entryErr.formName).to.equal(mageEventAttrs.forms[0].name)
        expect(Array.from(entryErr.entryLevelErrors)).to.have.lengthOf(1).with.members([ FormEntryValidationErrorReason.DuplicateId ])
        entryErr = errs.get(3)!
        expect(entryErr.fieldErrors.size).to.equal(0)
        expect(entryErr.formEntryId).to.equal('dup id')
        expect(entryErr.formEntryPosition).to.equal(3)
        expect(entryErr.formName).to.equal(mageEventAttrs.forms[0].name)
        expect(Array.from(entryErr.entryLevelErrors)).to.have.lengthOf(1).with.members([ FormEntryValidationErrorReason.DuplicateId ])
      })

      it('fails with fewer entries than the event requires', function() {

        const o = makeObservationAttrs(mageEventAttrs.id)
        mageEventAttrs.minObservationForms = 1
        const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.equal(true)
        expect(invalid.totalFormCountError?.constraint).to.equal(MinFormsConstraint)
        expect(invalid.totalFormCountError?.constraintCount).to.equal(Number(mageEventAttrs.minObservationForms))
      })

      it('fails with more entries than the event allows', function() {

        mageEventAttrs.maxObservationForms = 1
        const o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = [
          { id: 'entry1', formId: mageEventAttrs.forms[0].id }, { id: 'entry2', formId: mageEventAttrs.forms[0].id }
        ]
        const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.equal(true)
        expect(invalid.totalFormCountError?.constraint).to.equal(MaxFormsConstraint)
        expect(invalid.totalFormCountError?.constraintCount).to.equal(Number(mageEventAttrs.maxObservationForms))
      })

      it('fails with fewer entries than the form min constraint', function() {

        mageEventAttrs.forms[0].min = 1
        let o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = []
        let invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.equal(true)
        expect(invalid.formCountErrors).to.have.length(1)
        expect(invalid.formCountErrors[0][0]).to.equal(mageEventAttrs.forms[0].id)
        expect(invalid.formCountErrors[0][1].constraint).to.equal(MinFormsConstraint)

        mageEventAttrs.forms[0].min = 2
        o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = [ { id: uniqid(), formId: mageEventAttrs.forms[0].id } ]
        invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.equal(true)
        expect(invalid.formCountErrors).to.have.length(1)
        expect(invalid.formCountErrors[0][0]).to.equal(mageEventAttrs.forms[0].id)
        expect(invalid.formCountErrors[0][1].constraint).to.equal(MinFormsConstraint)
      })

      it('fails with more entries than the form max constraint', function() {

        mageEventAttrs.forms[0].max = 1
        const o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = [
          { id: uniqid(), formId: mageEventAttrs.forms[0].id },
          { id: uniqid(), formId: mageEventAttrs.forms[0].id }
        ]
        const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.equal(true)
        expect(invalid.formCountErrors).to.have.length(1)
        expect(invalid.formCountErrors[0][0]).to.equal(mageEventAttrs.forms[0].id)
        expect(invalid.formCountErrors[0][1].constraint).to.equal(MaxFormsConstraint)
      })

      it('does not enforce the min constraint of an archived form', function() {

        mageEventAttrs.minObservationForms = 0
        mageEventAttrs.forms[0].archived = true
        mageEventAttrs.forms[0].min = 1
        let o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = []
        let invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors, validationResultMessage(invalid)).to.be.false

        mageEventAttrs.forms[0].min = 2
        o.properties.forms = [
          { id: uniqid(), formId: mageEventAttrs.forms[0].id }
        ]
        invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors, validationResultMessage(invalid)).to.be.false

        mageEventAttrs.forms[0].archived = false
        o = makeObservationAttrs(mageEventAttrs.id)
        invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.be.true
        expect(invalid.formCountErrors).to.have.length(1)
        expect(invalid.formCountErrors[0][0]).to.equal(mageEventAttrs.forms[0].id)
        expect(invalid.formCountErrors[0][1].constraint).to.equal(MinFormsConstraint)
      })

      it('does not enforce the max constraint of an archived form', function() {

        mageEventAttrs.minObservationForms = 0
        mageEventAttrs.maxObservationForms = 10
        mageEventAttrs.forms[0].archived = true
        mageEventAttrs.forms[0].max = 1
        let o = makeObservationAttrs(mageEventAttrs.id)
        o.properties.forms = [
          { id: uniqid(), formId: mageEventAttrs.forms[0].id },
          { id: uniqid(), formId: mageEventAttrs.forms[0].id }
        ]
        let invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors, validationResultMessage(invalid)).to.be.false

        mageEventAttrs.forms[0].archived = false
        invalid = validateObservation(o, new MageEvent(mageEventAttrs))

        expect(invalid.hasErrors).to.be.true
        expect(invalid.formCountErrors).to.have.length(1)
        expect(invalid.formCountErrors[0][0]).to.equal(mageEventAttrs.forms[0].id)
        expect(invalid.formCountErrors[0][1].constraint).to.equal(MaxFormsConstraint)
      })

      it('validates all the field types', function() {

        const choices: FormFieldChoice[] = [
          Object.freeze({ id: 0, title: 'Choice 0', value: 0 }),
          Object.freeze({ id: 1, title: 'Choice 1', value: 1 }),
          Object.freeze({ id: 2, title: 'Choice 2', value: 2 })
        ]
        const form: Form = {
          id: 0,
          fields: [
            {
              id: 0,
              name: FormFieldType.Attachment,
              required: false,
              title: 'Field 1',
              type: FormFieldType.Attachment,
              allowedAttachmentTypes: [ AttachmentPresentationType.Image ]
            },
            {
              id: 1,
              name: FormFieldType.CheckBox,
              required: false,
              title: 'Field 2',
              type: FormFieldType.CheckBox
            },
            {
              id: 2,
              name: FormFieldType.DateTime,
              required: false,
              title: 'Field 2',
              type: FormFieldType.DateTime
            },
            {
              id: 3,
              name: FormFieldType.Dropdown,
              required: false,
              title: 'Field 3',
              type: FormFieldType.Dropdown,
              choices: [ ...choices ]
            },
            {
              id: 4,
              name: FormFieldType.Email,
              required: false,
              title: 'Field 4',
              type: FormFieldType.Email
            },
            {
              id: 5,
              name: FormFieldType.Geometry,
              required: false,
              title: 'Field 5',
              type: FormFieldType.Geometry
            },
            {
              id: 6,
              name: FormFieldType.Hidden,
              required: false,
              title: 'Field 6',
              type: FormFieldType.Hidden,
              value: 'secret'
            },
            {
              id: 7,
              name: FormFieldType.MultiSelectDropdown,
              required: false,
              title: 'Field 7',
              type: FormFieldType.MultiSelectDropdown,
              choices: [ ...choices ]
            },
            {
              id: 8,
              name: FormFieldType.Numeric,
              required: false,
              title: 'Field 8',
              type: FormFieldType.Numeric,
              min: Number.MAX_SAFE_INTEGER
            },
            {
              id: 9,
              name: FormFieldType.Password,
              required: false,
              title: 'Field 9',
              type: FormFieldType.Password,
            },
            {
              id: 10,
              name: FormFieldType.Radio,
              required: false,
              title: 'Field 10',
              type: FormFieldType.Radio,
              choices: [ ...choices ]
            },
            {
              id: 11,
              name: FormFieldType.Text,
              required: false,
              title: 'Field 11',
              type: FormFieldType.Text
            },
            {
              id: 12,
              name: FormFieldType.TextArea,
              required: false,
              title: 'Field 12',
              type: FormFieldType.TextArea
            },
          ],
          archived: false,
          color: 'green',
          name: 'form0',
          userFields: [],
        }
        mageEventAttrs = {
          ...mageEventAttrs,
          forms: [ form ]
        }
        const invalidFormEntry: FormEntry = {
          id: 'entry0',
          formId: form.id,
          [FormFieldType.CheckBox]: 'not a boolean',
          [FormFieldType.DateTime]: 12345,
          [FormFieldType.Dropdown]: {} as any,
          [FormFieldType.Email]: 'not an email',
          [FormFieldType.Geometry]: 'not a geometry',
          [FormFieldType.Hidden]: 'whatever',
          [FormFieldType.MultiSelectDropdown]: {} as any,
          [FormFieldType.Numeric]: 0,
          [FormFieldType.Password]: {} as any,
          [FormFieldType.Radio]: {} as any,
          [FormFieldType.Text]: {} as any,
          [FormFieldType.TextArea]: {} as any
        }
        const attachmentId = 'attachment1'
        const validFormEntry: FormEntry = {
          id: invalidFormEntry.id,
          formId: form.id,
          [FormFieldType.CheckBox]: true,
          [FormFieldType.DateTime]: new Date().toISOString(),
          [FormFieldType.Dropdown]: choices[1].title,
          [FormFieldType.Email]: 'mage1@test.mage',
          [FormFieldType.Geometry]: { type: 'Point', coordinates: [ 106, 38 ] },
          [FormFieldType.Hidden]: `¯\_(ツ)_/¯`,
          [FormFieldType.MultiSelectDropdown]: [ choices[0].title, choices[1].title ],
          [FormFieldType.Numeric]: Number.MAX_SAFE_INTEGER,
          [FormFieldType.Password]: `m@g3i5th3b3$t`,
          [FormFieldType.Radio]: choices[2].title,
          [FormFieldType.Text]: 'steven forkhead',
          [FormFieldType.TextArea]: 'stop blowing my hat wind'
        }
        const invalidAttachment: Attachment = {
          id: attachmentId,
          fieldName: FormFieldType.Attachment,
          lastModified: new Date(),
          observationFormId: invalidFormEntry.id,
          oriented: false,
          thumbnails: [],
          contentType: 'application/unacceptable'
        }
        const validAttachment: Attachment = {
          ...invalidAttachment,
          contentType: AttachmentMediaTypes.image[0]
        }
        const observationAttrs = makeObservationAttrs(mageEventAttrs.id)
        const untestedFieldTypes = new Set<FormFieldType>(Object.values(FormFieldType))
        const untestedFields = new Set<string>(form.fields.map(x => x.name))
        for (const field of form.fields) {
          untestedFieldTypes.delete(field.type)
          if (invalidFormEntry.hasOwnProperty(field.name) && validFormEntry.hasOwnProperty(field.name)) {
            untestedFields.delete(field.name)
          }
        }

        expect(Array.from(untestedFieldTypes), `untested field types: ${Array.from(untestedFieldTypes)}`).to.be.empty
        expect(Array.from(untestedFields), `untested fields: ${Array.from(untestedFields)}`).to.deep.equal([ FormFieldType.Attachment ])

        const mageEvent = new MageEvent(mageEventAttrs)
        observationAttrs.properties.forms = [ invalidFormEntry ]
        observationAttrs.attachments = [ invalidAttachment ]
        let invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.formEntryErrors.length).to.equal(1)
        const formEntryError = new Map(invalid.formEntryErrors).get(0)
        expect(formEntryError).to.exist
        // currently, hidden field validation is a no-op
        const invalidFieldsExceptHidden = form.fields.filter(x => x.type !== FormFieldType.Hidden).map(x => x.name)
        expect(formEntryError?.fieldErrors).to.have.keys(invalidFieldsExceptHidden)

        observationAttrs.properties.forms = [ validFormEntry ]
        observationAttrs.attachments = [ validAttachment ]
        invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.hasErrors).to.be.false
      })

      it('validates required constraint for all field tyoes', function() {

        const choices: FormFieldChoice[] = [
          Object.freeze({ id: 0, title: 'Choice 0', value: 0 }),
          Object.freeze({ id: 1, title: 'Choice 1', value: 1 }),
          Object.freeze({ id: 2, title: 'Choice 2', value: 2 })
        ]
        const form: Form = {
          id: 0,
          fields: [
            {
              /*
              attachments use min/max to constrain the number of required
              attachments, so using the required flag does not make sense
              */
              id: 0,
              name: FormFieldType.Attachment,
              required: true,
              title: 'Field 1',
              type: FormFieldType.Attachment,
              allowedAttachmentTypes: [ AttachmentPresentationType.Image ],
              min: 1
            },
            {
              id: 1,
              name: FormFieldType.CheckBox,
              required: true,
              title: 'Field 2',
              type: FormFieldType.CheckBox
            },
            {
              id: 2,
              name: FormFieldType.DateTime,
              required: true,
              title: 'Field 2',
              type: FormFieldType.DateTime
            },
            {
              id: 3,
              name: FormFieldType.Dropdown,
              required: true,
              title: 'Field 3',
              type: FormFieldType.Dropdown,
              choices: [ ...choices ]
            },
            {
              id: 4,
              name: FormFieldType.Email,
              required: true,
              title: 'Field 4',
              type: FormFieldType.Email
            },
            {
              id: 5,
              name: FormFieldType.Geometry,
              required: true,
              title: 'Field 5',
              type: FormFieldType.Geometry
            },
            {
              id: 6,
              name: FormFieldType.Hidden,
              required: true,
              title: 'Field 6',
              type: FormFieldType.Hidden,
              value: 'secret'
            },
            {
              id: 7,
              name: FormFieldType.MultiSelectDropdown,
              required: true,
              title: 'Field 7',
              type: FormFieldType.MultiSelectDropdown,
              choices: [ ...choices ]
            },
            {
              id: 8,
              name: FormFieldType.Numeric,
              required: true,
              title: 'Field 8',
              type: FormFieldType.Numeric,
              min: Number.MAX_SAFE_INTEGER
            },
            {
              id: 9,
              name: FormFieldType.Password,
              required: true,
              title: 'Field 9',
              type: FormFieldType.Password,
            },
            {
              id: 10,
              name: FormFieldType.Radio,
              required: true,
              title: 'Field 10',
              type: FormFieldType.Radio,
              choices: [ ...choices ]
            },
            {
              id: 11,
              name: FormFieldType.Text,
              required: true,
              title: 'Field 11',
              type: FormFieldType.Text
            },
            {
              id: 12,
              name: FormFieldType.TextArea,
              required: true,
              title: 'Field 12',
              type: FormFieldType.TextArea
            },
          ],
          archived: false,
          color: 'green',
          name: 'form0',
          userFields: [],
        }
        mageEventAttrs = {
          ...mageEventAttrs,
          forms: [ form ]
        }
        const invalidFormEntry: FormEntry = {
          id: 'entry0',
          formId: form.id,
          [FormFieldType.CheckBox]: null,
          [FormFieldType.DateTime]: null,
          [FormFieldType.Dropdown]: null,
          [FormFieldType.Email]: null,
          [FormFieldType.Geometry]: null,
          [FormFieldType.Hidden]: null,
          [FormFieldType.MultiSelectDropdown]: null,
          [FormFieldType.Numeric]: null,
          [FormFieldType.Password]: null,
          [FormFieldType.Radio]: null,
          [FormFieldType.Text]: null,
          [FormFieldType.TextArea]: null
        }
        const attachmentId = 'attachment1'
        const validFormEntry: FormEntry = {
          id: invalidFormEntry.id,
          formId: form.id,
          [FormFieldType.CheckBox]: true,
          [FormFieldType.DateTime]: new Date().toISOString(),
          [FormFieldType.Dropdown]: choices[1].title,
          [FormFieldType.Email]: 'mage1@test.mage',
          [FormFieldType.Geometry]: { type: 'Point', coordinates: [ 106, 38 ] },
          [FormFieldType.Hidden]: `¯\_(ツ)_/¯`,
          [FormFieldType.MultiSelectDropdown]: [ choices[0].title, choices[1].title ],
          [FormFieldType.Numeric]: Number.MAX_SAFE_INTEGER,
          [FormFieldType.Password]: `m@g3i5th3b3$t`,
          [FormFieldType.Radio]: choices[2].title,
          [FormFieldType.Text]: 'steven forkhead',
          [FormFieldType.TextArea]: 'stop blowing my hat wind'
        }
        const attachment: Attachment = {
          id: attachmentId,
          fieldName: FormFieldType.Attachment,
          lastModified: new Date(),
          observationFormId: invalidFormEntry.id,
          oriented: false,
          thumbnails: [],
          contentType: AttachmentMediaTypes.image[0]
        }
        const observationAttrs = makeObservationAttrs(mageEventAttrs.id)
        const untestedFieldTypes = new Set<FormFieldType>(Object.values(FormFieldType))
        const untestedFields = new Set<string>(form.fields.map(x => x.name))
        for (const field of form.fields) {
          untestedFieldTypes.delete(field.type)
          if (validFormEntry.hasOwnProperty(field.name)) {
            untestedFields.delete(field.name)
          }
        }

        expect(Array.from(untestedFieldTypes), `untested field types: ${Array.from(untestedFieldTypes)}`).to.be.empty
        expect(Array.from(untestedFields), `untested fields: ${Array.from(untestedFields)}`).to.deep.equal([ FormFieldType.Attachment ])

        const mageEvent = new MageEvent(mageEventAttrs)
        observationAttrs.properties.forms = [ invalidFormEntry ]
        observationAttrs.attachments = []
        let invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.formEntryErrors.length).to.equal(1)
        const formEntryError = new Map(invalid.formEntryErrors).get(0)
        expect(formEntryError).to.exist
        // currently, hidden field validation is a no-op
        const invalidFieldsExceptHidden = form.fields.filter(x => x.type !== FormFieldType.Hidden).map(x => x.name)
        expect(formEntryError?.fieldErrors).to.have.keys(invalidFieldsExceptHidden)

        observationAttrs.properties.forms = [ validFormEntry ]
        observationAttrs.attachments = [ attachment ]
        invalid = validateObservation(observationAttrs, mageEvent)

        console.info(validationResultMessage(invalid))
        expect(invalid.hasErrors).to.be.false
      })

      it('passes when a required numeric field value is zero', function() {

        const form: Form = {
          id: 0,
          fields: [
            {
              id: 1,
              name: FormFieldType.Numeric,
              required: true,
              title: 'Field 8',
              type: FormFieldType.Numeric,
              min: 0,
              max: 100,
            },
          ],
          archived: false,
          color: 'green',
          name: 'form0',
          userFields: [],
        }
        mageEventAttrs = {
          ...mageEventAttrs,
          forms: [ form ]
        }
        const invalidFormEntryUndef: FormEntry = {
          id: 'entry0',
          formId: form.id,
        }
        const invalidFormEntryNull: FormEntry = {
          ...invalidFormEntryUndef,
          [FormFieldType.Numeric]: null
        }
        const validFormEntry: FormEntry = {
          id: invalidFormEntryUndef.id,
          formId: form.id,
          [FormFieldType.Numeric]: 0,
        }
        const observationAttrs = makeObservationAttrs(mageEventAttrs.id)
        const mageEvent = new MageEvent(mageEventAttrs)
        observationAttrs.properties.forms = [ invalidFormEntryUndef ]
        let invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.formEntryErrors.length).to.equal(1)
        let formEntryError = new Map(invalid.formEntryErrors).get(0)
        expect(formEntryError).to.exist
        expect(formEntryError?.fieldErrors.size).to.equal(1)
        expect(formEntryError?.fieldErrors).to.have.keys(FormFieldType.Numeric)

        observationAttrs.properties.forms = [ invalidFormEntryNull ]
        invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.formEntryErrors.length).to.equal(1)
        formEntryError = new Map(invalid.formEntryErrors).get(0)
        expect(formEntryError).to.exist
        expect(formEntryError?.fieldErrors.size).to.equal(1)
        expect(formEntryError?.fieldErrors).to.have.keys(FormFieldType.Numeric)

        observationAttrs.properties.forms = [ validFormEntry ]
        invalid = validateObservation(observationAttrs, mageEvent)

        expect(invalid.hasErrors).to.be.false
      })

      describe('attachment validation', function() {

        let field: FormField
        let formEntry: FormEntry
        let attachment1: Attachment

        beforeEach(function() {

          field = {
            type: FormFieldType.Attachment,
            id: 1,
            name: 'field1',
            required: false,
            title: 'Min/Max Attachment Test',
            allowedAttachmentTypes: undefined
          }
          mageEventAttrs.forms[0].fields = [ field ]
          formEntry = {
            id: 'formEntry0',
            formId: mageEventAttrs.forms[0].id,
          }
          attachment1 = {
            id: 'attachment1',
            fieldName: field.name,
            observationFormId: formEntry.id,
            lastModified: new Date(),
            oriented: false,
            thumbnails: [],
          }
        })

        it('allows any attachment type when the field does not constrain attachment types', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = [ attachment1 ]
          const valid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

          expect(valid.hasErrors).to.be.false
        })

        describe('supported image types', function() {

          const supportedImageTypes = [
            'image/gif',
            'image/jpeg',
            'image/png',
            'image/webp'
          ]
          for (const supportedImageType of supportedImageTypes) {

            it(`allows ${supportedImageType}`, function() {

              field.allowedAttachmentTypes = [ AttachmentPresentationType.Image ]
              const observationAttrs = makeObservationAttrs(mageEventAttrs)
              observationAttrs.properties.forms = [ formEntry ]
              attachment1.contentType = supportedImageType
              observationAttrs.attachments = [ attachment1 ]
              const valid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

              expect(valid.hasErrors).to.be.false
            })
          }

          it('does not allow some other image type', function() {

            field.allowedAttachmentTypes = [ AttachmentPresentationType.Image ]
            const observationAttrs = makeObservationAttrs(mageEventAttrs)
            observationAttrs.properties.forms = [ formEntry ]
            attachment1.contentType = 'image/trash'
            observationAttrs.attachments = [ attachment1 ]
            const invalid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

            expect(invalid.hasErrors).to.be.true
            const errs = new Map(invalid.formEntryErrors)
            expect(errs.size).to.equal(1)
            const entryErr = errs.get(0)
            expect(entryErr?.formEntryId).to.equal(formEntry.id)
            expect(entryErr?.fieldErrors).to.have.all.keys(field.name)
            expect(entryErr?.fieldErrors.get(field.name)?.constraint).to.equal(FieldConstraintKey.Value)
          })
        })

        it('validates min/max constraints on attachment fields', function() {

          field.min = 1
          field.max = 2
          const attachment2: Attachment = {
            ...attachment1,
            id: 'attachment2',
          }
          const attachment3: Attachment = {
            ...attachment1,
            id: 'attachment3',
          }
          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          observationAttrs.properties.forms = [ formEntry ]

          let invalid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

          expect(invalid.hasErrors).to.be.true
          let formEntryErrors = new Map(invalid.formEntryErrors)
          expect(formEntryErrors.size).to.equal(1)
          expect(formEntryErrors).to.have.all.keys(0)
          let fieldErrors = formEntryErrors.get(0)?.fieldErrors
          expect(fieldErrors?.size).to.equal(1)
          expect(fieldErrors?.get(field.name)?.constraint).to.equal(FieldConstraintKey.Min)

          observationAttrs.attachments = [ attachment1, attachment2, attachment3 ]
          invalid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

          expect(invalid.hasErrors).to.be.true
          formEntryErrors = new Map(invalid.formEntryErrors)
          expect(formEntryErrors.size).to.equal(1)
          expect(formEntryErrors).to.have.all.keys(0)
          fieldErrors = formEntryErrors.get(0)?.fieldErrors
          expect(fieldErrors?.size).to.equal(1)
          expect(fieldErrors?.get(field.name)?.constraint).to.equal(FieldConstraintKey.Max)

          observationAttrs.attachments = [ attachment1, attachment2 ]
          const valid = validateObservation(observationAttrs, new MageEvent(mageEventAttrs))

          expect(valid.hasErrors).to.be.false
        })

        it('validates all attachments reference a form entry and field that exists', function() {

          const o = makeObservationAttrs(mageEventAttrs)
          o.properties.forms = [ formEntry ]
          o.attachments = [
            {
              id: 'a1',
              observationFormId: 'invalid form entry',
              fieldName: field.name,
              name: 'invalid form entry.jpg',
              lastModified: new Date(),
              oriented: false,
              thumbnails: []
            },
            {
              id: 'a2',
              observationFormId: formEntry.id,
              fieldName: 'invalid field',
              name: 'invalid field.jpg',
              lastModified: new Date(),
              oriented: false,
              thumbnails: []
            }
          ]
          const invalid = validateObservation(o, new MageEvent(mageEventAttrs))
          const attachmentErrors = new Map(invalid.attachmentErrors)
          expect(attachmentErrors.size).to.equal(2)
          expect(attachmentErrors.get(0)?.reason).to.equal(AttachmentValidationErrorReason.FormEntryRef)
          expect(attachmentErrors.get(1)?.reason).to.equal(AttachmentValidationErrorReason.FieldRef)
        })

        it('validates attachment ids are unique on the observation', function() {

          const o = makeObservationAttrs(mageEventAttrs)
          o.properties.forms = [ formEntry ]
          o.attachments = [
            {
              id: 'a1',
              observationFormId: formEntry.id,
              fieldName: field.name,
              name: 'dup id 1.jpg',
              lastModified: new Date(Date.now() - 1000),
              oriented: false,
              thumbnails: []
            },
            {
              id: 'a1',
              observationFormId: formEntry.id,
              fieldName: field.name,
              name: 'dup id 2.jpg',
              lastModified: new Date(),
              oriented: false,
              thumbnails: []
            }
          ]
          const invalid = validateObservation(o, new MageEvent(mageEventAttrs))

          const attachmentErrors = new Map(invalid.attachmentErrors)
          expect(attachmentErrors.size).to.equal(2)
          expect(attachmentErrors.get(0)?.reason).to.equal(AttachmentValidationErrorReason.DuplicateId)
          expect(attachmentErrors.get(1)?.reason).to.equal(AttachmentValidationErrorReason.DuplicateId)
        })
      })

      it('TODO: validates one thumbnail per min dimension')
    })
  })

  describe('creating observation instances', function() {

    /*
    TODO: domain event for observation create - fired from repository?
    */

    it('does not allow constructing an observation directly', function() {

      try {
        const observation = new Observation()
      }
      catch (err) {
        return
      }
      expect.fail('constructor succeeded')
    })

    it('adds a default active state if there are no states', function() {

      const attrs = makeObservationAttrs(mageEventAttrs)
      attrs.userId = 'user1'
      const observation = Observation.evaluate(attrs, new MageEvent(mageEventAttrs))

      expect(observation.states).to.have.length(1)
      expect(observation.states[0].name).to.equal('active')
      expect(observation.states[0].id).to.equal(PendingEntityId)
      expect(observation.states[0].userId).to.equal(attrs.userId)
    })

    it('parses date field entries during for the evaulated observation', function() {

      const form: Form = {
        id: 1,
        fields: [
          {
            id: 1,
            name: 'parsedDate',
            required: false,
            title: 'Parsed Date',
            type: FormFieldType.DateTime
          },
        ],
        archived: false,
        color: 'green',
        name: 'form0',
        userFields: [],
      }
      mageEventAttrs = {
        ...mageEventAttrs,
        forms: [ form ]
      }
      const mageEvent = new MageEvent(mageEventAttrs)
      const attrs = makeObservationAttrs(mageEventAttrs.id)
      const dateEntry1 = new Date(Date.now() - 1000 * 60 * 5)
      const dateEntry2 = new Date(Date.now() - 1000 * 60 * 3)
      attrs.properties.forms = [
        { id: 'entry1', formId: form.id, parsedDate: dateEntry1.toISOString() },
        { id: 'entry2', formId: form.id, parsedDate: dateEntry2.toISOString() },
      ]
      const obs = Observation.evaluate(attrs, mageEvent)

      expect(obs.validation.hasErrors).to.be.false
      expect(obs.formEntryForId('entry1')?.parsedDate).to.deep.equal(dateEntry1)
      expect(obs.formEntryForId('entry2')?.parsedDate).to.deep.equal(dateEntry2)
      expect(attrs.properties.forms[0].parsedDate).to.equal(dateEntry1.toISOString(), 'should not mutate input attrs')
      expect(attrs.properties.forms[1].parsedDate).to.equal(dateEntry2.toISOString(), 'should not mutate input attrs')
    })

    it('accepts date field entries that are already date instances', function() {

      const form: Form = {
        id: 1,
        fields: [
          {
            id: 1,
            name: 'parsedDate',
            required: false,
            title: 'Parsed Date',
            type: FormFieldType.DateTime
          },
        ],
        archived: false,
        color: 'green',
        name: 'form0',
        userFields: [],
      }
      mageEventAttrs = {
        ...mageEventAttrs,
        forms: [ form ]
      }
      const mageEvent = new MageEvent(mageEventAttrs)
      const attrs = makeObservationAttrs(mageEventAttrs.id)
      const dateEntry1 = new Date(Date.now() - 1000 * 60 * 5)
      const dateEntry2 = new Date(Date.now() - 1000 * 60 * 3)
      attrs.properties.forms = [
        { id: 'entry1', formId: form.id, parsedDate: dateEntry1 },
        { id: 'entry2', formId: form.id, parsedDate: dateEntry2 },
      ]
      const obs = Observation.evaluate(attrs, mageEvent)

      expect(obs.validation.hasErrors).to.be.false
      expect(obs.formEntryForId('entry1')?.parsedDate).to.deep.equal(dateEntry1)
      expect(obs.formEntryForId('entry2')?.parsedDate).to.deep.equal(dateEntry2)
      expect(attrs.properties.forms[0].parsedDate).to.deep.equal(dateEntry1, 'should not mutate input attrs')
      expect(attrs.properties.forms[1].parsedDate).to.deep.equal(dateEntry2, 'should not mutate input attrs')
    })

    it.skip('deep copies and does not reference any values from the source attributes')
  })

  describe('observation mutations', function() {

    /*
    TODO: add domain events for observation mutations
    single event for core value type attrs - geometry, timestamp, etc.
    - maybe separate event for geometry? location change might be significant
    event for attachment add/update/remove - but wait for attachment content?
    event for form add/update/remove
    */

    describe('total update with put semantics', function() {

      let mageEvent: MageEvent
      let form1: Form
      let form2: Form

      beforeEach(function() {
        form1 = {
          id: 1001,
          name: 'Form 1',
          archived: false,
          color: 'red',
          userFields: [],
          fields: [
            {
              id: 1,
              name: 'field1',
              required: false,
              title: 'Form 1 Field 1',
              type: FormFieldType.Text
            },
            {
              id: 2,
              name: 'field2',
              required: false,
              title: 'Form 1 Field 2',
              type: FormFieldType.Attachment,
              allowedAttachmentTypes: [ AttachmentPresentationType.Audio ]
            }
          ],
        }
        form2 = {
          id: 2001,
          name: 'Form 2',
          archived: false,
          color: 'green',
          userFields: [],
          fields: [
            {
              id: 1,
              name: 'field1',
              required: false,
              title: 'Form 2 Field 1',
              type: FormFieldType.Numeric,
              min: 10,
              max: 100,
            },
          ],
        }
        mageEventAttrs.forms = [ form1, form2 ]
        mageEvent = new MageEvent(mageEventAttrs)
      })

      it('updates geometry', function() {

        const beforeGeom: Point = {
          type: 'Point',
          coordinates: [ 100, 20 ]
        }
        const afterGeom: Point = {
          type: 'Point',
          coordinates: [ 111, 22 ]
        }
        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.geometry = beforeGeom
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.geometry = afterGeom
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'geometry', 'lastModified')
        const afterUnchanged = _.omit(after, 'geometry', 'lastModified')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.geometry).to.deep.equal(beforeGeom)
        expect(after.geometry).to.deep.equal(afterGeom)
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
      })

      it('updates timestamp', function() {

        const now = Date.now()
        const diff = 1000 * 60 * 99
        const then = Date.now() - diff
        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.timestamp = new Date(then)
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.properties.timestamp = new Date(now)
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'properties.timestamp', 'lastModified')
        const afterUnchanged = _.omit(after, 'properties.timestamp', 'lastModified')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.properties.timestamp.getTime()).to.equal(then)
        expect(after.properties.timestamp.getTime()).to.equal(now)
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
      })

      it('does not change create timestamp', function() {

        const now = Date.now()
        const diff = 1000 * 60 * 99
        const then = Date.now() - diff
        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.createdAt = new Date(then)
        const before = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.createdAt = new Date(now)
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(copyObservationAttrs(before), 'createdAt', 'lastModified')
        const afterUnchanged = _.omit(copyObservationAttrs(after), 'createdAt', 'lastModified')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(after.createdAt.getTime()).to.equal(before.createdAt.getTime())
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
      })

      it('adds form entries', function() {

        const beforeAttrs = makeObservationAttrs(mageEvent)
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        // the app layer should get a valid id from the repository first; ids
        // are an adapter/infrastructure concern to properly enforce uniqueness
        // in a given context
        afterAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'a new form entry'
          }
        ]
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'properties.forms', 'lastModified')
        const afterUnchanged = _.omit(before, 'properties.forms', 'lastModified')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.properties.forms).to.deep.equal([])
        expect(after.validation.hasErrors).to.be.false
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        expect(after.properties.forms).to.deep.equal(afterAttrs.properties.forms)
        // TODO: form entry added event
        // expect(after.pendingEvents).to.include(...)
      })

      it('updates form entries', function() {

        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry before'
          }
        ]
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry after'
          }
        ]
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'properties.forms')
        const afterUnchanged = _.omit(before, 'properties.forms')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.properties.forms).to.deep.equal([
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry before'
          }
        ])
        expect(after.validation.hasErrors).to.be.false
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        expect(after.properties.forms).to.deep.equal([
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry after'
          }
        ])
        // TODO: form entry udpated event?
      })

      it('removes form entries', function() {

        // TODO: form entry removed event?

        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry 1 before'
          },
          {
            id: 'formEntry2',
            formId: form1.id,
            field1: 'form entry 2 before'
          }
        ]
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.properties.forms = [
          {
            id: 'formEntry2',
            formId: form1.id,
            field1: 'form entry 2 after'
          }
        ]
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'properties.forms')
        const afterUnchanged = _.omit(before, 'properties.forms')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.properties.forms).to.deep.equal([
          {
            id: 'formEntry1',
            formId: form1.id,
            field1: 'form entry 1 before'
          },
          {
            id: 'formEntry2',
            formId: form1.id,
            field1: 'form entry 2 before'
          }
        ])
        expect(after.validation.hasErrors).to.be.false
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        expect(after.properties.forms).to.deep.equal([
          {
            id: 'formEntry2',
            formId: form1.id,
            field1: 'form entry 2 after'
          }
        ])
        expect(after.pendingEvents).to.deep.equal([])
      })

      it.skip('removes child attachments of removed form entries', function() {
        /*
        TODO: better to just let the observation become invalid if assigning
        attrs with removed form enties and orphaned attachments?  but then is
        Observation.assignTo() really worth anything?
        */
      })

      it.skip('TODO: adds attachments', function() {
        // TODO: attachment added event?
      })

      it('updates attachments', function() {

        const beforeLastModified = Date.now() - 1000 * 60 * 35
        const beforeAttrs = {
          ...makeObservationAttrs(mageEvent),
          lastModified: new Date(beforeLastModified),
        }
        beforeAttrs.properties.forms = [
          {
            id: 'attachments',
            formId: form1.id
          }
        ]
        beforeAttrs.attachments = [
          {
            id: 'a1',
            fieldName: 'field2',
            observationFormId: 'attachments',
            lastModified: new Date(beforeLastModified),
            oriented: false,
            name: 'test1.mp4',
            contentType: 'audio/mp4',
            size: 12345,
            thumbnails: []
          }
        ]
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.attachments = [
          {
            id: 'a1',
            fieldName: 'field2',
            observationFormId: 'attachments',
            lastModified: new Date(beforeLastModified),
            oriented: true,
            name: 'test2.mp4',
            contentType: 'audio/mp4',
            size: 23456,
            thumbnails: []
          }
        ]
        const before = Observation.evaluate(beforeAttrs, mageEvent)
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'attachments', 'lastModified')
        const afterUnchanged = _.omit(before, 'attachments', 'lastModified')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.attachments[0]).to.deep.include({
          id: 'a1',
          fieldName: 'field2',
          observationFormId: 'attachments',
          oriented: false,
          name: 'test1.mp4',
          contentType: 'audio/mp4',
          size: 12345,
          thumbnails: []
        })
        expect(after.validation.hasErrors).to.be.false
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        expect(after.attachments.length).to.equal(1)
        /*
        TODO: this is counterintuitive, but some investigation into the legacy
        code reveals that nothing ever sets lastModified on attachment
        documents.  eventually this wholesale put semantics for observations
        should go away in favor of the finer grained update functions like
        patchAttachment, which will always set lastModified.  updating
        lastModified on attachments in a wholesale update is more difficult
        because the code would need to do a deep diff of every attachment on
        the observation to determine which attachments actually changed, so
        for now, since nothing sets lastModified anyway, this update will just
        use the lastModified given in the update attrs.
        */
        expect(after.attachments[0].lastModified?.getTime()).to.equal(before.lastModified.getTime())
        expect(after.attachments[0]).to.deep.include({
          id: 'a1',
          fieldName: 'field2',
          observationFormId: 'attachments',
          oriented: true,
          name: 'test2.mp4',
          contentType: 'audio/mp4',
          size: 23456,
          thumbnails: []
        })
        // TODO: attachment updated event
      })

      it('removes attachments with domain events', function() {

        const beforeLastModified = Date.now() - 1000 * 60 * 60
        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.forms = [
          {
            id: 'attachments',
            formId: form1.id
          }
        ]
        beforeAttrs.attachments = [
          {
            id: 'a1',
            fieldName: 'field2',
            observationFormId: 'attachments',
            lastModified: new Date(beforeLastModified),
            oriented: false,
            name: 'test1.mp4',
            contentType: 'audio/mp4',
            size: 12345,
            thumbnails: []
          },
          {
            id: 'a2',
            fieldName: 'field2',
            observationFormId: 'attachments',
            lastModified: new Date(beforeLastModified),
            oriented: false,
            name: 'test1.mp4',
            contentType: 'image/jpeg',
            size: 657687,
            thumbnails: []
          },
        ]
        const afterAttrs1 = copyObservationAttrs(beforeAttrs)
        afterAttrs1.attachments = [ copyAttachmentAttrs(beforeAttrs.attachments[0]) ]
        const afterAttrs2 = copyObservationAttrs(beforeAttrs)
        afterAttrs2.attachments = []
        const before = Observation.evaluate(beforeAttrs, mageEvent)
        const after1 = Observation.assignTo(before, afterAttrs1) as Observation
        const after2 = Observation.assignTo(after1, afterAttrs2) as Observation

        const beforeUnchanged = _.omit(before, 'lastModified', 'attachments', 'pendingEvents')
        const after1Unchanged = _.omit(after1, 'lastModified', 'attachments', 'pendingEvents')
        const after2Unchanged = _.omit(after2, 'lastModified', 'attachments', 'pendingEvents')
        expect(after1Unchanged).to.deep.equal(beforeUnchanged)
        expect(after2Unchanged).to.deep.equal(beforeUnchanged)
        expect(before.lastModified.getTime()).to.equal(beforeLastModified)
        expect(after1.validation.hasErrors).to.be.false
        expect(after1.lastModified.getTime()).to.be.closeTo(Date.now(), 150)
        expect(after1.attachments).to.deep.equal([ copyAttachmentAttrs(before.attachments[0]) ])
        expect(after1.pendingEvents).to.deep.equal([
          {
            type: ObservationDomainEventType.AttachmentsRemoved,
            removedAttachments: [ copyAttachmentAttrs(before.attachments[1]) ]
          }
        ])
        expect(after2.validation.hasErrors).to.be.false
        expect(after2.lastModified.getTime()).to.be.closeTo(Date.now(), 150)
        expect(after2.attachments).to.deep.equal([])
        expect(after2.pendingEvents).to.deep.equal([
          {
            type: ObservationDomainEventType.AttachmentsRemoved,
            removedAttachments: [ copyAttachmentAttrs(before.attachments[1]), copyAttachmentAttrs(before.attachments[0]) ]
          }
        ])
      })

      it('can make an invalid observation valid', function() {

        const invalidFieldEntry = form2.fields[0].min as number - 1
        const validFieldEntry = form2.fields[0].min as number
        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form2.id,
            field1: invalidFieldEntry
          }
        ]
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form2.id,
            field1: validFieldEntry
          }
        ]
        const after = Observation.assignTo(before, afterAttrs) as Observation

        const beforeUnchanged = _.omit(before, 'properties.forms')
        const afterUnchanged = _.omit(before, 'properties.forms')
        expect(afterUnchanged).to.deep.equal(beforeUnchanged)
        expect(before.properties.forms).to.deep.equal([
          {
            id: 'formEntry1',
            formId: form2.id,
            field1: invalidFieldEntry
          }
        ])
        expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        expect(after.properties.forms).to.deep.equal([
          {
            id: 'formEntry1',
            formId: form2.id,
            field1: validFieldEntry
          }
        ])
        expect(before.validation.hasErrors).to.be.true
        expect(after.validation.hasErrors).to.be.false
      })

      it.skip('TODO: fails if the observation id does not match', function() { })

      it('fails if the event id does not match', function() {

        const beforeAttrs = makeObservationAttrs(mageEvent)
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.eventId = beforeAttrs.eventId + 1
        const after = Observation.assignTo(before, afterAttrs) as ObservationUpdateError

        expect(after).to.be.instanceOf(ObservationUpdateError)
        expect(after.reason).to.equal(ObservationUpdateErrorReason.EventId)
      })

      it('adds an attachments removed event for removed attachments', function() {

        const beforeAttrs = makeObservationAttrs(mageEvent)
        beforeAttrs.properties.forms = [
          {
            id: 'formEntry1',
            formId: form1.id,
          },
          {
            id: 'formEntry2',
            formId: form1.id,
          }
        ]
        beforeAttrs.attachments = [
          { id: 'a1', observationFormId: 'formEntry1', fieldName: 'field2', name: 'remove1.mp3', contentType: 'audio/mp4', oriented: false, thumbnails: [] },
          { id: 'a2', observationFormId: 'formEntry2', fieldName: 'field2', name: 'keep.mp3', contentType: 'audio/mp4', oriented: false, thumbnails: [] },
          { id: 'a3', observationFormId: 'formEntry1', fieldName: 'field2', name: 'remove2.mp3', contentType: 'audio/mp4', oriented: false, thumbnails: [] },
        ]
        const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
        const afterAttrs = copyObservationAttrs(beforeAttrs)
        afterAttrs.properties.forms = [ beforeAttrs.properties.forms[1] ]
        afterAttrs.attachments = [ beforeAttrs.attachments[1] ]
        const after = Observation.assignTo(before, afterAttrs) as Observation

        expect(before.validation.hasErrors).to.be.false
        expect(after.validation.hasErrors).to.be.false
        expect(after.pendingEvents).to.deep.equal([
          {
            type: ObservationDomainEventType.AttachmentsRemoved,
            removedAttachments: [
              copyAttachmentAttrs(beforeAttrs.attachments[0]),
              copyAttachmentAttrs(beforeAttrs.attachments[2])
            ]
          }
        ])
      })

      it.skip('TODO: fails if the device id does not match', function() { })
    })

    describe('form entries', function() {

      it.skip('TODO: provides mutation functions for adding, updating, and removing form entries')
      it.skip('TODO: fails if the form entry ids are not unique on the observation')

      describe('removing form entries', function() {

        let mageEvent: MageEvent
        let form1: Form
        let form2: Form

        beforeEach(function() {
          form1 = {
            id: 1,
            name: 'Form 1',
            fields: [
              {
                id: 1,
                name: 'form1Text',
                title: 'Form 1 Text',
                type: FormFieldType.Text,
                required: false,
              },
              {
                id: 2,
                name: 'form1Attachment',
                title: 'Form 1 Attachment',
                type: FormFieldType.Attachment,
                required: false,
              },
            ],
            userFields: [],
            min: 1,
            color: '#aabbcc',
            archived: false
          }
          form2 = {
            id: 2,
            name: 'Form 2',
            fields: [
              {
                id: 1,
                name: 'form2Text',
                title: 'Form 2 Text',
                type: FormFieldType.Text,
                required: false,
              },
              {
                id: 2,
                name: 'form2Attachment',
                title: 'Form 2 Attachment',
                type: FormFieldType.Attachment,
                required: false,
              },
            ],
            userFields: [],
            color: '#aabbcc',
            archived: false
          }
          mageEventAttrs.forms = [ form1, form2 ]
          mageEvent = new MageEvent(mageEventAttrs)
        })

        it('removes the specified entry', function() {

          const beforeAttrs = makeObservationAttrs(mageEvent)
          beforeAttrs.properties.forms = [
            {
              id: 'formEntry1',
              formId: form1.id,
              form1Text: 'form entry 1'
            },
            {
              id: 'formEntry2',
              formId: form1.id,
              form1Text: 'form entry 2'
            }
          ]
          const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
          const after = removeFormEntry(before, before.formEntries[0].id)

          expect(after.validation.hasErrors).to.be.false
          expect(after.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
          expect(after.properties.forms).to.deep.equal([
            {
              id: 'formEntry2',
              formId: form1.id,
              form1Text: 'form entry 2'
            }
          ])
        })

        it('removes attachments that reference removed form entries', function() {

          const beforeAttrs = makeObservationAttrs(mageEvent)
          beforeAttrs.properties.forms = [
            {
              id: 'formEntry1',
              formId: form1.id,
              form1Text: 'form entry 1'
            },
            {
              id: 'formEntry2',
              formId: form1.id,
              form1Text: 'form entry 2'
            }
          ]
          beforeAttrs.attachments = [
            { id: uniqid(), observationFormId: 'formEntry1', fieldName: 'form1Attachment', name: 'a1.png', oriented: false, thumbnails: [] },
            { id: uniqid(), observationFormId: 'formEntry1', fieldName: 'form1Attachment', name: 'a2.png', oriented: false, thumbnails: [] },
            { id: uniqid(), observationFormId: 'formEntry2', fieldName: 'form1Attachment', name: 'a3.png', oriented: false, thumbnails: [] },
          ]
          const before: Observation = Observation.evaluate(beforeAttrs, mageEvent)
          const after1 = removeFormEntry(before, 'formEntry1')
          const after2 = removeFormEntry(after1, 'formEntry2')

          expect(after1.formEntries).to.deep.equal([
            { id: 'formEntry2', formId: form1.id, form1Text: 'form entry 2' }
          ])
          expect(after1.attachments).to.deep.equal([
            copyAttachmentAttrs({ id: before.attachments[2].id, observationFormId: 'formEntry2', fieldName: 'form1Attachment', name: 'a3.png', oriented: false, thumbnails: [] })
          ])
          console.info('INVALID --- \n', validationResultMessage(after2.validation))
          expect(after1.validation.hasErrors).to.be.false
          expect(after2.formEntries).to.be.empty
          expect(after2.attachments).to.be.empty
          expect(after2.validation.hasErrors).to.be.true
        })
      })
    })

    describe('attachments', function() {

      let attachmentField1: FormField
      let attachmentField2: FormField
      let nonAttachmentField: FormField
      let mageEvent: MageEvent

      beforeEach(function() {
        attachmentField1 = {
          id: 0,
          type: FormFieldType.Attachment,
          name: 'attachment1',
          title: 'Attachment 1',
          required: false,
          min: 0,
          max: 5,
          allowedAttachmentTypes: [ AttachmentPresentationType.Image ]
        }
        attachmentField2 = {
          id: 1,
          type: FormFieldType.Attachment,
          name: 'attachment2',
          title: 'Attachment 2',
          required: false,
          min: 0,
          max: 1,
          allowedAttachmentTypes: [ AttachmentPresentationType.Video ]
        }
        nonAttachmentField = {
          id: 2,
          type: FormFieldType.Text,
          name: 'nonAttachment',
          title: 'Non-Attachment',
          required: false
        }
        mageEventAttrs.forms[0].fields = [
          attachmentField1,
          nonAttachmentField,
          attachmentField2
        ]
        mageEvent = new MageEvent(mageEventAttrs)
      })

      describe('adding attachments', function() {

        it('adds an attachment for given field and form entry', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const mod = addAttachment(observation, 'a123', attachmentField1.name, formEntry.id, attachmentAttrs)

          if (mod instanceof AttachmentAddError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.validation.hasErrors).to.be.false
          expect(mod.attachments.length).to.equal(1)
          expect(mod.attachments[0]).to.deep.include({
            ...attachmentAttrs,
            id: 'a123',
            fieldName: attachmentField1.name,
            observationFormId: formEntry.id,
          })
          expect(mod.attachments[0].lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('fails if the form entry does not exist', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const invalid = addAttachment(observation, 'a789', attachmentField1.name, 'wut form', attachmentAttrs)

          if (invalid instanceof Observation) {
            expect.fail('expected an error')
          }
          expect(invalid.validationErr?.reason).to.equal(AttachmentValidationErrorReason.FormEntryRef)
        })

        it('fails if the field does not exist', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const invalid = addAttachment(observation, 'never', 'wut field', formEntry.id, attachmentAttrs)

          if (invalid instanceof Observation) {
            expect.fail('expected a validation error')
          }
          expect(invalid.validationErr?.reason).to.equal(AttachmentValidationErrorReason.FieldRef)
        })

        it('fails if the field name is not an attachment field', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const invalid = addAttachment(observation, 'never', nonAttachmentField.name, formEntry.id, attachmentAttrs)

          if (invalid instanceof Observation) {
            expect.fail('expected a validation error')
          }
          expect(invalid.validationErr?.reason).to.equal(AttachmentValidationErrorReason.FieldRef)
        })

        it('fails if the attachment id is not unique on the observation', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const mod1 = addAttachment(observation, 'a1', attachmentField2.name, formEntry.id, attachmentAttrs) as Observation
          const mod2 = addAttachment(mod1, 'a1', attachmentField2.name, formEntry.id, attachmentAttrs)

          if (mod2 instanceof Observation) {
            expect.fail('expected an error')
          }
          expect(mod2.validationErr?.reason).to.equal(AttachmentValidationErrorReason.DuplicateId)
        })

        it('returns an invalid observation if the attachment violates the form constraints', function() {

          const observationAttrs = makeObservationAttrs(mageEventAttrs)
          const formEntry: FormEntry = {
            id: 'form0',
            formId: mageEvent.forms[0].id,
          }
          observationAttrs.properties.forms = [ formEntry ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const attachmentAttrs: AttachmentCreateAttrs = {
            contentType: 'image/jpeg',
            name: 'test.jpg',
            oriented: false,
            thumbnails: []
          }
          const mod1 = addAttachment(observation, 'a1', attachmentField2.name, formEntry.id, attachmentAttrs) as Observation
          const mod2 = addAttachment(mod1, 'a2', attachmentField2.name, formEntry.id, attachmentAttrs)

          if (mod2 instanceof AttachmentAddError) {
            expect.fail('expected an observation instance')
          }
          expect(mod2.attachments.length).to.equal(2)
          expect(mod2.validation.hasErrors).to.be.true
          const formEntryErrors = new Map(mod2.validation.formEntryErrors)
          expect(formEntryErrors.size).to.equal(1)
          const entryErr = formEntryErrors.get(0)
          expect(entryErr?.fieldErrors.size).to.equal(1)
          const fieldErr = entryErr?.fieldErrors.get(attachmentField2.name)
          expect(fieldErr?.constraint).to.equal(FieldConstraintKey.Max)
        })
      })

      describe('updating attachments', function() {

        it('patches the target attachment', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachment: Required<Attachment> = {
            id: 'attachment0',
            fieldName: attachmentField1.name,
            observationFormId: formEntry.id,
            lastModified: new Date(Date.now() - 1000 * 60),
            oriented: false,
            thumbnails: [],
            contentType: 'image/png',
            height: 100,
            width: 200,
            name: 'test.png',
            size: 123456,
            contentLocator: 'abc123:attachment0'
          }
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.lastModified = new Date(Date.now() - 1000 * 60 * 60)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = [ attachment ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)

          expect(observation.validation.hasErrors).to.be.false

          const patch: Required<AttachmentPatchAttrs> = {
            contentType: 'image/jpeg',
            height: 200,
            width: 400,
            name: 'test.jpeg',
            oriented: true,
            size: 12345,
            contentLocator: '0pl9ok',
            thumbnails: [
              { minDimension: 60, contentType: 'image/jpeg', width: 120, height: 60, name: 'test-thumb-1.jpeg', size: 1234, contentLocator: 'z1x2c3' }
            ]
          }
          const mod = patchAttachment(observation, attachment.id, patch)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.attachments.length).to.equal(1)
          expect(mod.attachments[0]).to.deep.include(patch)
          expect(mod.attachments[0].lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('patches the first attachment', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachment: Required<Attachment> = {
            id: 'attachment0',
            fieldName: attachmentField1.name,
            observationFormId: formEntry.id,
            lastModified: new Date(Date.now() - 1000 * 60),
            oriented: false,
            thumbnails: [],
            contentType: 'image/png',
            height: 100,
            width: 200,
            name: 'test.png',
            size: 123456,
            contentLocator: '1q2w3e'
          }
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.lastModified = new Date(Date.now() - 1000 * 60 * 60)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = [ attachment ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)

          expect(observation.validation.hasErrors).to.be.false

          const patch: Required<AttachmentPatchAttrs> = {
            contentType: 'image/jpeg',
            height: 200,
            width: 400,
            name: 'test.jpeg',
            oriented: true,
            size: 12345,
            contentLocator: 'r4t5y6',
            thumbnails: [
              { minDimension: 60, contentType: 'image/jpeg', width: 120, height: 60, name: 'test-thumb-1.jpeg', size: 1234, contentLocator: '8u7y6t' }
            ]
          }
          const mod = patchAttachment(observation, attachment.id, patch)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.attachments.length).to.equal(1)
          expect(mod.attachments[0]).to.deep.include(patch)
          expect(mod.attachments[0].lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('TODO: patches the last attachment')
        it('TODO: patches an attachment in the middle')
        it('TODO: fails if the attachment does not exist')
        it('TODO: fails if the attachment is invalid')

        it('adds a new thumbnail to an attachment', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachment: Required<Attachment> = {
            id: 'attachment0',
            fieldName: attachmentField1.name,
            observationFormId: formEntry.id,
            lastModified: new Date(Date.now() - 1000 * 60),
            oriented: false,
            thumbnails: [],
            contentType: 'image/png',
            height: 100,
            width: 200,
            name: 'test.png',
            size: 123456,
            contentLocator: 'abc123:attachment0'
          }
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = [ attachment ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)

          expect(observation.validation.hasErrors).to.be.false

          const thumb: Required<Thumbnail> = {
            minDimension: 100,
            contentLocator: '1qa2ws3ed',
            contentType: 'image/png',
            width: 100,
            height: 150,
            name: 'test@100.png',
            size: 500
          }
          const mod = putAttachmentThumbnailForMinDimension(observation, attachment.id, thumb)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.attachments.length).to.equal(1)
          expect(mod.attachments[0].thumbnails).to.deep.equal([ thumb ])
          expect(mod.attachments[0].lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('replaces a thumbnail for the same min dimension', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachment: Required<Attachment> = {
            id: 'attachment0',
            fieldName: attachmentField1.name,
            observationFormId: formEntry.id,
            lastModified: new Date(Date.now() - 1000 * 60),
            oriented: false,
            thumbnails: [
              { minDimension: 100, contentLocator: 'aw3se4dr5' },
              { minDimension: 200, contentLocator: '5rd4es3wa' },
              { minDimension: 400, contentLocator: '0ok9ij8uh' }
            ],
            contentType: 'image/png',
            height: 100,
            width: 200,
            name: 'test.png',
            size: 123456,
            contentLocator: 'abc123:attachment0'
          }
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = [ attachment ]
          const observation = Observation.evaluate(observationAttrs, mageEvent)
          const thumb: Required<Thumbnail> = {
            minDimension: 200,
            contentLocator: 'somewhere else',
            contentType: 'image/png',
            width: 200,
            height: 300,
            name: 'test@200.png',
            size: 720
          }
          const mod = putAttachmentThumbnailForMinDimension(observation, attachment.id, thumb)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.attachments.length).to.equal(1)
          expect(mod.attachments[0].thumbnails).to.deep.equal([ copyThumbnailAttrs(attachment.thumbnails[0]), thumb, copyThumbnailAttrs(attachment.thumbnails[2]) ])
          expect(mod.attachments[0].lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })
      })

      describe('removing attachments', function() {

        it('removes the attachment for the given id', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachments: Attachment[] = [
            {
              id: 'attachment0',
              fieldName: attachmentField1.name,
              observationFormId: formEntry.id,
              oriented: false,
              thumbnails: [],
              name: 'test1.png',
              contentType: 'image/png',
              size: 123456,
              contentLocator: 'abc123:attachment0'
            },
            {
              id: 'attachment1',
              fieldName: attachmentField1.name,
              observationFormId: formEntry.id,
              oriented: false,
              thumbnails: [],
              name: 'test2.png',
              contentType: 'image/png',
              size: 654321,
              contentLocator: 'abc123:attachment1'
            }
          ]
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = attachments
          const before = Observation.evaluate(observationAttrs, mageEvent)
          const after = Observation.evaluate(
            {
              ...copyObservationAttrs(observationAttrs),
              attachments: [ attachments[1] ]
            },
            mageEvent
          )
          const mod = removeAttachment(before, attachments[0].id)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(mod.validation.hasErrors).to.be.false
          expect(mod.attachments).to.have.length(1)
          expect(copyAttachmentAttrs(mod.attachments[0])).to.deep.equal(copyAttachmentAttrs(before.attachments[1]))
          expect(_.omit(copyObservationAttrs(mod), 'lastModified')).to.deep.equal(_.omit(copyObservationAttrs(after), 'lastModified'))
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('returns an invalid observation if removing the attachment violates the form constraints', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachments: Attachment[] = [
            {
              id: 'attachment0',
              fieldName: attachmentField1.name,
              observationFormId: formEntry.id,
              oriented: false,
              thumbnails: [],
              name: 'test1.png',
              contentType: 'image/png',
              size: 123456,
              contentLocator: 'abc123:attachment0'
            }
          ]
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = attachments
          mageEvent = new MageEvent({
            ...copyMageEventAttrs(mageEvent),
            forms: [
              {
                ...mageEvent.forms[0],
                fields: [
                  {
                    ...attachmentField1,
                    min: 1
                  }
                ]
              }
            ]
          })
          const before = Observation.evaluate(observationAttrs, mageEvent)
          const after = Observation.evaluate(
            {
              ...copyObservationAttrs(observationAttrs),
              attachments: []
            },
            mageEvent
          )
          const mod = removeAttachment(before, attachments[0].id)

          if (mod instanceof AttachmentNotFoundError) {
            expect.fail('expected an observation instance')
          }
          expect(before.validation.hasErrors, 'before should be valid').to.be.false
          expect(after.validation.hasErrors, 'after should be invalid').to.be.true
          expect(mod.validation.hasErrors, 'mod should be invalid').to.be.true
          expect(mod.attachments).to.be.empty
          expect(_.omit(copyObservationAttrs(mod), 'lastModified')).to.deep.equal(_.omit(copyObservationAttrs(after), 'lastModified'))
          expect(mod.lastModified.getTime()).to.be.closeTo(Date.now(), 100)
        })

        it('returns an error if the attachment id does not exist', function() {

          const formEntry: FormEntry = {
            id: 'formEntry0',
            formId: mageEvent.forms[0].id,
          }
          const attachments: Attachment[] = [
            {
              id: 'attachment0',
              fieldName: attachmentField1.name,
              observationFormId: formEntry.id,
              oriented: false,
              thumbnails: [],
              name: 'test1.png',
              contentType: 'image/png',
              size: 123456,
              contentLocator: 'abc123:attachment0'
            }
          ]
          const observationAttrs: ObservationAttrs = makeObservationAttrs(mageEventAttrs.id)
          observationAttrs.properties.forms = [ formEntry ]
          observationAttrs.attachments = attachments
          const before = Observation.evaluate(observationAttrs, mageEvent)
          const mod = removeAttachment(before, attachments[0].id + 'wut') as AttachmentNotFoundError

          expect(mod).to.be.instanceOf(AttachmentNotFoundError)
          expect(before.validation.hasErrors, 'before should be valid').to.be.false
          expect(before.attachments).to.have.length(1)
          expect(copyAttachmentAttrs(before.attachments[0])).to.deep.equal(copyAttachmentAttrs(attachments[0]))
        })

        it('TODO: adds an attachment removed event to the observation')
      })
    })

    describe('adding form entries', function() {

    })

    describe('updating form entries', function() {

    })

    describe('removing form entries', function() {

    })
  })

  describe('attachments', function() {

    describe('selecting a thumbnail representation', function() {

      it('selects the thumbnail with the smallest minimum dimension greater than the target dimension', function() {

        const att: Attachment = {
          id: uniqid(),
          observationFormId: uniqid(),
          fieldName: 'field1',
          oriented: false,
          thumbnails: [
            { minDimension: 220, contentLocator: uniqid() },
            { minDimension: 60, contentLocator: uniqid() },
            { minDimension: 340, contentLocator: uniqid() },
            { minDimension: 100, contentLocator: uniqid() },
          ]
        }

        expect(thumbnailIndexForTargetDimension(24, att)).to.equal(1)
        expect(thumbnailIndexForTargetDimension(76, att)).to.equal(3)
        expect(thumbnailIndexForTargetDimension(100, att)).to.equal(3)
        expect(thumbnailIndexForTargetDimension(200, att)).to.equal(0)
        expect(thumbnailIndexForTargetDimension(339, att)).to.equal(2)
        expect(thumbnailIndexForTargetDimension(400, att)).to.be.undefined
      })
    })
  })
})
