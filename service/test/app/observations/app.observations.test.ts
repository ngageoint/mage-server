import Substitute, { Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import * as api from '../../../lib/app.api/observations/app.api.observations'
import { AllocateObservationId, SaveObservation } from '../../../lib/app.impl/observations/app.impl.observations'
import { copyMageEventAttrs, MageEvent } from '../../../lib/entities/events/entities.events'
import { copyObservationAttrs, EventScopedObservationRepository, Observation, ObservationAttrs, ObservationRepositoryError, ObservationRepositoryErrorCode, validationResultMessage } from '../../../lib/entities/observations/entities.observations'
import { permissionDenied, MageError, ErrPermissionDenied, ErrEntityNotFound, EntityNotFoundError, InvalidInputError, ErrInvalidInput } from '../../../lib/app.api/app.api.errors'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import deepEqual from 'deep-equal'
import _ from 'lodash'

describe.only('observations use case interactions', function() {

  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let permissions: SubstituteOf<api.ObservationPermissionService>
  let context: api.ObservationRequestContext
  let principalHandle: SubstituteOf<{ requestingPrincipal(): string }>
  let minimalObs: ObservationAttrs

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
    obsRepo = Substitute.for<EventScopedObservationRepository>()
    permissions = Substitute.for<api.ObservationPermissionService>()
    principalHandle = Substitute.for<{ requestingPrincipal(): string }>()
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
    })

    it('does not save when the obsevation event id does not match the context event', async function() {

      const eventIdOverride = mageEvent.id * 3
      const req: api.SaveObservationRequest = {
        context,
        observation: { ...api.exoObservationFor(minimalObs), eventId: eventIdOverride } as any
      }
      obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservation))
      const res = await saveObservation(req)
      const err = res.error as InvalidInputError

      expect(res.success).to.be.null
      expect(err.code).to.equal(ErrInvalidInput)
      obsRepo.received(1).save(Arg.any())
    })

    it('validates the id for a new observation', async function() {

      const req: api.SaveObservationRequest = {
        context,
        observation: api.exoObservationFor(minimalObs)
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

    it.only('obtains ids for new form entries', async function() {

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
            }
          ],
          userFields: []
        }
      ]
      mageEvent = new MageEvent(eventAttrs)
      context.mageEvent = mageEvent
      const formId = mageEvent.forms[0].id
      const obsBefore = Observation.evaluate({
        ...minimalObs,
        properties: {
          timestamp: minimalObs.properties.timestamp,
          forms: [
            { id: uniqid(), formId, field1: 'existing form entry' }
          ]
        }
      }, mageEvent)
      const nextEntryId = uniqid()
      const obsAfter = Observation.evaluate({
        ...copyObservationAttrs(obsBefore),
        properties: {
          timestamp: obsBefore.properties.timestamp,
          forms: [
            ...obsBefore.properties.forms,
            { id: nextEntryId, formId, field1: 'new form entry' }
          ]
        },
      }, mageEvent)
      const obsMod: api.ExoObservationMod = {
        ...copyObservationAttrs(obsBefore),
        properties: {
          timestamp: minimalObs.properties.timestamp,
          forms: [
            { ...obsBefore.properties.forms[0] },
            { id: 'next1', formId, field1: 'new form entry' }
          ]
        }
      }
      const req: api.SaveObservationRequest = {
        context,
        observation: obsMod
      }
      obsRepo.findById(obsBefore.id).resolves(obsBefore)
      obsRepo.nextFormEntryIds(1).resolves([ nextEntryId ])
      obsRepo.save(Arg.all()).resolves(obsAfter)
      const res = await saveObservation(req)
      const saved = res.success as api.ExoObservation

      expect(res.error).to.be.null
      console.info(validationResultMessage(obsAfter.validation))
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
      expect.fail('todo')
    })

    it('preserves ids of existing attachments', async function() {
      expect.fail('todo')
    })

    it('preserves attachment thumbnails even though app clients do not send them', async function() {
      expect.fail('todo')
    })

    it('removes attachment content for removed form entries', async function() {
      expect.fail('todo')
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

function equalToObservationIgnoringDates(expected: ObservationAttrs): (actual: ObservationAttrs) => boolean {
  const expectedWithoutDates = _.omit(copyObservationAttrs(expected), 'createdAt', 'lastModified')
  return actual => {
    const actualWithoutDates = _.omit(copyObservationAttrs(actual), 'createdAt', 'lastModified')
    expect(actualWithoutDates).to.deep.equal(expectedWithoutDates)
    return deepEqual(actualWithoutDates, expectedWithoutDates)
  }
}

function validObservation(): (actual: Observation) => boolean {
  return actual => !actual.validation.hasErrors
}