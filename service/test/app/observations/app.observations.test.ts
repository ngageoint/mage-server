import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import * as api from '../../../lib/app.api/observations/app.api.observations'
import { AllocateObservationId, SaveObservation } from '../../../lib/app.impl/observations/app.impl.observations'
import { copyMageEventAttrs, MageEvent } from '../../../lib/entities/events/entities.events'
import { addAttachment, Attachment, AttachmentCreateAttrs, copyAttachmentAttrs, copyObservationAttrs, EventScopedObservationRepository, Observation, ObservationAttrs, ObservationRepositoryError, ObservationRepositoryErrorCode, validationResultMessage } from '../../../lib/entities/observations/entities.observations'
import { permissionDenied, MageError, ErrPermissionDenied, ErrEntityNotFound, EntityNotFoundError, InvalidInputError, ErrInvalidInput, PermissionDeniedError } from '../../../lib/app.api/app.api.errors'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import deepEqual from 'deep-equal'
import _ from 'lodash'

describe.only('observations use case interactions', function() {

  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let permissions: SubstituteOf<api.ObservationPermissionService>
  let context: api.ObservationRequestContext
  let principalHandle: SubstituteOf<{ requestingPrincipal(): string }>

  beforeEach(function() {

    mageEvent = new MageEvent({
      id: Date.now(),
      acl: {},
      feedIds: [],
      forms: [],
      layerIds: [],
      name: 'Observation App Layer Tests',
      style: {}
    })
    obsRepo = Sub.for<EventScopedObservationRepository>()
    permissions = Sub.for<api.ObservationPermissionService>()
    principalHandle = Sub.for<{ requestingPrincipal(): string }>()
    context = {
      mageEvent,
      userId: uniqid(),
      deviceId: uniqid(),
      observationRepository: obsRepo,
      requestToken: uniqid(),
      requestingPrincipal() { return principalHandle.requestingPrincipal() },
      locale() { return null }
    }
  })

  describe('allocating observation ids', function() {

    let allocateObservationId: api.AllocateObservationId

    beforeEach(function() {
      allocateObservationId = AllocateObservationId(permissions)
    })

    it('fails without permission', async function() {

      permissions.ensureCreateObservationPermission(Arg.all()).resolves(permissionDenied('create observation', 'test1'))
      const res = await allocateObservationId({ context })

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      permissions.received(1).ensureCreateObservationPermission(context)
      obsRepo.didNotReceive().allocateObservationId()
    })

    it('gets a new observation id from the context repository', async function() {

      const id = uniqid()
      permissions.ensureCreateObservationPermission(Arg.all()).resolves(null)
      obsRepo.allocateObservationId().resolves(id)
      const res = await allocateObservationId({ context })

      expect(res.error).to.be.null
      expect(res.success).to.equal(id)
    })

    it.skip('TODO: handles rejected promises')
  })

  describe('saving observations', function() {

    let saveObservation: api.SaveObservation
    let minimalObs: ObservationAttrs

    beforeEach(function() {
      saveObservation = SaveObservation(permissions)
      minimalObs = {
        id: uniqid(),
        eventId: mageEvent.id,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 13, 57 ] },
        properties: {
          timestamp: new Date(),
          forms: []
        },
        attachments: [],
        states: [],
      }
      permissions.ensureCreateObservationPermission(Arg.all()).resolves(null)
      permissions.ensureUpdateObservationPermission(Arg.all()).resolves(null)
    })

    it('does not save when the obsevation event id does not match the context event', async function() {

      const eventIdOverride = mageEvent.id * 3
      const req: api.SaveObservationRequest = {
        context,
        observation: { ...observationModFor(minimalObs), eventId: eventIdOverride } as any
      }
      obsRepo.findById(Arg.any()).resolves(null)
      obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservation))
      const res = await saveObservation(req)
      const err = res.error as InvalidInputError

      expect(res.success).to.be.null
      expect(err.code).to.equal(ErrInvalidInput)
      obsRepo.received(1).save(Arg.any())
    })

    describe('creating', function() {

      beforeEach(function() {
        obsRepo.findById(Arg.any()).resolves(null)
      })

      it('ensures create permission when no observation exists', async function() {

        const deny = Sub.for<api.ObservationPermissionService>()
        deny.ensureCreateObservationPermission(Arg.all()).resolves(permissionDenied('test create', context.userId, minimalObs.id))
        saveObservation = SaveObservation(deny)
        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        const res = await saveObservation(req)
        const denied = res.error as PermissionDeniedError

        expect(res.success).to.be.null
        expect(denied).to.be.instanceOf(MageError)
        expect(denied.code).to.equal(ErrPermissionDenied)
        deny.received(1).ensureCreateObservationPermission(context)
        deny.didNotReceive().ensureUpdateObservationPermission(Arg.all())
        obsRepo.didNotReceive().save(Arg.all())
      })

      it('validates the id for a new observation', async function() {

        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId))
        const res = await saveObservation(req)
        const err = res.error as EntityNotFoundError

        expect(res.success).to.be.null
        expect(err).to.be.instanceOf(MageError)
        expect(err.code).to.equal(ErrEntityNotFound)
        expect(err.data.entityId).to.equal(minimalObs.id)
        expect(err.data.entityType).to.equal('ObservationId')
        obsRepo.received(1).save(Arg.any())
      })
    })

    describe('updating', function() {

      let obsBefore: Observation

      beforeEach(function() {

        const eventAttrs = copyMageEventAttrs(mageEvent)
        eventAttrs.forms = [
          {
            id: 135,
            name: 'Form 1',
            archived: false,
            color: '#123456',
            fields: [
              {
                id: 876,
                name: 'field1',
                required: false,
                title: 'Field 1',
                type: FormFieldType.Text,
              },
              {
                id: 987,
                name: 'field2',
                required: false,
                title: 'Field 2',
                type: FormFieldType.Attachment
              }
            ],
            userFields: []
          }
        ]
        mageEvent = new MageEvent(eventAttrs)
        context.mageEvent = mageEvent
        const formId = mageEvent.forms[0].id
        const formEntryId = uniqid()
        obsBefore = Observation.evaluate({
          ...minimalObs,
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              { id: formEntryId, formId, field1: 'existing form entry' }
            ],
          },
          attachments: [
            {
              id: uniqid(),
              observationFormId: formEntryId,
              fieldName: 'field2',
              name: 'photo1.png',
              oriented: false,
              thumbnails: [
                { minDimension: 120, name: 'photo1@120.png' }
              ]
            }
          ]
        }, mageEvent)
        obsRepo.findById(obsBefore.id).resolves(obsBefore)
      })

      it('ensures update permission when an observation already exists', async function() {

        const deny = Sub.for<api.ObservationPermissionService>()
        deny.ensureUpdateObservationPermission(Arg.all()).resolves(permissionDenied('test update', context.userId, minimalObs.id))
        saveObservation = SaveObservation(deny)
        const req: api.SaveObservationRequest = {
          context,
          observation: observationModFor(minimalObs)
        }
        const res = await saveObservation(req)
        const denied = res.error as PermissionDeniedError

        expect(res.success).to.be.null
        expect(denied).to.be.instanceOf(MageError)
        expect(denied.code).to.equal(ErrPermissionDenied)
        deny.received(1).ensureUpdateObservationPermission(context)
        deny.didNotReceive().ensureCreateObservationPermission(Arg.all())
        obsRepo.didNotReceive().save(Arg.all())
      })

      it('obtains ids for new form entries', async function() {

        const nextEntryId = uniqid()
        const obsAfter = Observation.evaluate({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: obsBefore.properties.timestamp,
            forms: [
              ...obsBefore.properties.forms,
              { id: nextEntryId, formId: mageEvent.forms[0].id, field1: 'new form entry' }
            ]
          },
        }, mageEvent)
        const obsMod: api.ExoObservationMod = {
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              { ...obsBefore.properties.forms[0] },
              { id: 'next1', formId: mageEvent.forms[0].id, field1: 'new form entry' }
            ]
          }
        }
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextFormEntryIds(1).resolves([ nextEntryId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms[0]).to.deep.equal(obsBefore.properties.forms[0])
        expect(saved.properties.forms[1]).to.deep.equal({
          id: nextEntryId,
          formId: mageEvent.forms[0].id,
          field1: 'new form entry'
        })
        obsRepo.received(1).nextFormEntryIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter)))
        obsRepo.received(1).save(Arg.all())
      })

      it('obtains attachment ids for new attachments', async function() {

        /*
        do clients send a complete array of attachments for the form fields or
        only the attachments with actions?
        answer: web app just sends the action attachments
        */

        const nextAttachmentId = uniqid()
        const newAttachment: AttachmentCreateAttrs = {
          oriented: false,
          thumbnails: [],
          size: 123678,
          name: 'new attachment.png'
        }
        const obsAfter = addAttachment(obsBefore, nextAttachmentId, 'field2', obsBefore.formEntries[0].id, newAttachment) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                field2: [{
                  action: api.AttachmentModAction.Add,
                  name: newAttachment.name,
                  size: newAttachment.size
                }]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextAttachmentIds(1).resolves([ nextAttachmentId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.deep.equal(obsBefore.properties.forms)
        expect(saved.attachments).to.have.length(2)
        expect(saved.attachments.map(omitUndefinedFrom)).to.deep.equal(obsAfter.attachments.map(api.exoAttachmentFor).map(omitUndefinedFrom))
        obsRepo.received(1).nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('ignores form entry id and field name keys on added attachments', async function() {

        // use only the attachment mod's placement in the form entry
        const nextAttachmentId = uniqid()
        const newAttachment: AttachmentCreateAttrs = {
          oriented: false,
          thumbnails: [],
          name: 'new attachment.png'
        }
        const obsAfter = addAttachment(obsBefore, nextAttachmentId, 'field2', obsBefore.formEntries[0].id, newAttachment) as Observation
        const obsMod: api.ExoObservationMod = _.omit({
          ...copyObservationAttrs(obsBefore),
          properties: {
            timestamp: minimalObs.properties.timestamp,
            forms: [
              {
                ...obsBefore.properties.forms[0],
                field2: [{
                  observationFormId: 'invalidFormEntryId',
                  fieldName: 'notField2',
                  action: api.AttachmentModAction.Add,
                  name: newAttachment.name,
                }]
              },
            ]
          }
        }, 'attachments')
        const req: api.SaveObservationRequest = {
          context,
          observation: obsMod
        }
        obsRepo.nextAttachmentIds(1).resolves([ nextAttachmentId ])
        obsRepo.save(Arg.all()).resolves(obsAfter)
        const res = await saveObservation(req)
        const saved = res.success as api.ExoObservation

        expect(res.error).to.be.null
        expect(obsAfter.validation.hasErrors).to.be.false
        expect(saved.properties.forms).to.deep.equal(obsBefore.properties.forms)
        expect(saved.attachments).to.have.length(2)
        expect(saved.attachments[1].name).to.equal('new attachment.png')
        expect(saved.attachments[1].observationFormId).to.equal(obsBefore.formEntries[0].id)
        expect(saved.attachments[1].fieldName).to.equal('field2')
        expect(saved.attachments.map(omitUndefinedFrom)).to.deep.equal(obsAfter.attachments.map(api.exoAttachmentFor).map(omitUndefinedFrom))
        obsRepo.received(1).nextAttachmentIds(Arg.all())
        obsRepo.received(1).save(Arg.is(validObservation()))
        obsRepo.received(1).save(Arg.is(equalToObservationIgnoringDates(obsAfter, 'repository save argument')))
        obsRepo.received(1).save(Arg.all())
      })

      it('ignores the attachments array on the observation', async function() {
        expect.fail('todo')
      })

      it('does not save attachment mods without a corresponding form field', async function() {
        /*
        a client could submit an attachment mod array for a field name that
        does not exist in the event form, so just omit that from the final
        saved observation
        */
        expect.fail('todo')
      })

      it('preserves ids of existing attachments', async function() {
        expect.fail('todo')
      })

      it('preserves existing attachments when the attachment field entry is null', async function() {
        /*
        for some reason the web client sends a null value for the attachment field
        in form entries other than the one that has a new attachment appended, so
        the server needs to ignore that
        */
        expect.fail('todo')
      })

      it('preserves attachment thumbnails even though app clients do not send them', async function() {
        expect.fail('todo')
      })

      it('removes attachment content for removed form entries', async function() {
        expect.fail('todo')
      })
    })

    it('preserves creator user id', async function() {
      expect.fail('todo')
    })

    it('preserves creator device id', async function() {
      expect.fail('todo')
    })
  })

  describe('saving attachments', function() {

    it('checks permissions', async function() {
      expect.fail('todo')
    })

    it('saves the attachment content to the attachment store', async function() {
      expect.fail('todo')
    })
  })
})

function equalToObservationIgnoringDates(expected: ObservationAttrs, message?: string): (actual: ObservationAttrs) => boolean {
  const expectedWithoutDates = _.omit(copyObservationAttrs(expected), 'createdAt', 'lastModified')
  expectedWithoutDates.attachments.forEach(x => x.lastModified = new Date(0))
  return actual => {
    const actualWithoutDates = _.omit(copyObservationAttrs(actual), 'createdAt', 'lastModified')
    actualWithoutDates.attachments.forEach(x => x.lastModified = new Date(0))
    expect(actualWithoutDates).to.deep.equal(expectedWithoutDates, message)
    return true
  }
}

function validObservation(): (actual: Observation) => boolean {
  return actual => !actual.validation.hasErrors
}

function omitUndefinedFrom<T extends object>(x: T): Partial<T> {
  return _.omitBy(x, (value) => value === undefined)
}

function observationModFor(observation: ObservationAttrs): api.ExoObservationMod {
  return _.omit(copyObservationAttrs(observation), 'eventId', 'createdAt', 'lastModified', 'states', 'attachments')
}