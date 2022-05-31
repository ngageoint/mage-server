import Substitute, { Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import * as api from '../../../lib/app.api/observations/app.api.observations'
import { AllocateObservationId, SaveObservation } from '../../../lib/app.impl/observations/app.impl.observations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { EventScopedObservationRepository, Observation, ObservationAttrs, ObservationRepositoryError, ObservationRepositoryErrorCode } from '../../../lib/entities/observations/entities.observations'
import { permissionDenied, MageError, ErrPermissionDenied } from '../../../lib/app.api/app.api.errors'

describe.only('observations use case interactions', function() {

  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let permissions: SubstituteOf<api.ObservationPermissionService>
  let context: api.ObservationRequestContext
  let principalHandle: SubstituteOf<{ requestingPrincipal(): string }>
  let minimalObs: ObservationAttrs

  beforeEach(function() {

    mageEvent = new MageEvent({
      id: 123,
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
    let minimalObs: api.ObservationSaveAttrs

    beforeEach(function() {
      saveObservation = SaveObservation(permissions)
      minimalObs = {
        id: uniqid(),
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

    it('assigns the event id from the context event', async function() {

      const req: api.SaveObservationRequest = {
        context,
        observation: minimalObs
      }
      obsRepo.save(Arg.any()).resolves(Observation.evaluate({ ...minimalObs, eventId: mageEvent.id }, mageEvent))
      const res = await saveObservation(req)

      expect(res.error).to.be.null
      obsRepo.received(1).save(Arg.is(x => x.eventId === mageEvent.id))
    })

    it('validates the id for a new observation', async function() {

      const req: api.SaveObservationRequest = {
        context,
        observation: minimalObs
      }
      obsRepo.save(Arg.any()).resolves(new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId))
      const res = await saveObservation(req)

      expect.fail('todo')
    })

    it('fails if the obseravation id does not exist', async function() {
      expect.fail('todo')
    })

    it('obtains form entry ids for new form entries', async function() {
      expect.fail('todo')
    })

    it('obtains attachment ids for new attachments', async function() {
      expect.fail('todo')
    })
  })

  describe('saving attachments', function() {

    it('saves the attachment content to the attachment store', async function() {
      expect.fail('todo')
    })
  })
})