import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import EventEmitter from 'events'
import * as api from '../../../lib/app.api/observations/app.api.observations.search'
import { IndexEventObservations, indexAllEvents, SearchIndexAllEvents, SearchIndexEvent, registerObservationSavedHandler } from '../../../lib/app.impl/observations/app.impl.observations.search'
import { permissionDenied, MageError, ErrPermissionDenied, ErrEntityNotFound } from '../../../lib/app.api/app.api.errors'
import { MageEvent, MageEventAttrs, MageEventRepository } from '../../../lib/entities/events/entities.events'
import { EventScopedObservationRepository, ObservationAttrs, ObservationDomainEventType, ObservationRepositoryForEvent, ObservationSearchRepository } from '../../../lib/entities/observations/entities.observations'
import { Logger } from '../../../lib/entities/entities.logging'
import { AppRequestContext } from '../../../lib/app.api/app.api.global'

function eventAttrsStub(overrides?: Partial<MageEventAttrs>): MageEventAttrs {
  return {
    id: Date.now(),
    name: 'Search Test Event',
    layerIds: [],
    feedIds: [],
    forms: [],
    style: {},
    acl: {},
    ...overrides
  }
}

function contextStub(): AppRequestContext {
  return {
    requestToken: uniqid(),
    requestingPrincipal: () => 'test1',
    locale: () => null
  }
}

describe('observation search indexing', function() {

  let eventRepo: SubstituteOf<MageEventRepository>
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let searchRepo: SubstituteOf<ObservationSearchRepository>
  let log: SubstituteOf<Logger>
  let obsRepoFactory: ObservationRepositoryForEvent

  beforeEach(function() {
    eventRepo = Sub.for<MageEventRepository>()
    obsRepo = Sub.for<EventScopedObservationRepository>()
    searchRepo = Sub.for<ObservationSearchRepository>()
    log = Sub.for<Logger>()
    obsRepoFactory = async () => obsRepo
  })

  describe('IndexEventObservations', function() {

    it('does nothing if it cannot claim the indexing operation', async function() {

      const event = eventAttrsStub()
      eventRepo.claimIndexing(event.id).resolves(false)
      const indexEventObservations = IndexEventObservations(eventRepo, obsRepoFactory, searchRepo, log)

      await indexEventObservations(event)

      obsRepo.didNotReceive().iterate(Arg.any())
      searchRepo.didNotReceive().populate(Arg.any(), Arg.any(), Arg.any())
      eventRepo.didNotReceive().update(Arg.any())
    })

    it('populates the search index from the observation repository and marks the event indexed', async function() {

      const event = eventAttrsStub()
      const observations = { async *[Symbol.asyncIterator]() {} }
      eventRepo.claimIndexing(event.id).resolves(true)
      obsRepo.iterate(Arg.any()).returns(observations)
      searchRepo.populate(event.id, observations, false).resolves(5)
      const indexEventObservations = IndexEventObservations(eventRepo, obsRepoFactory, searchRepo, log)

      await indexEventObservations(event)

      searchRepo.received(1).populate(event.id, observations, false)
      eventRepo.received(1).update({ id: event.id, observationSearchStatus: 'indexed' })
    })

    it('passes the force flag through to populate', async function() {

      const event = eventAttrsStub()
      const observations = { async *[Symbol.asyncIterator]() {} }
      eventRepo.claimIndexing(event.id).resolves(true)
      obsRepo.iterate(Arg.any()).returns(observations)
      searchRepo.populate(event.id, observations, true).resolves(0)
      const indexEventObservations = IndexEventObservations(eventRepo, obsRepoFactory, searchRepo, log)

      await indexEventObservations(event, true)

      searchRepo.received(1).populate(event.id, observations, true)
    })

    it('closes the observation iterable when populate finishes', async function() {

      const event = eventAttrsStub()
      let closed = false
      const observations = { async *[Symbol.asyncIterator]() {}, close: () => { closed = true } }
      eventRepo.claimIndexing(event.id).resolves(true)
      obsRepo.iterate(Arg.any()).returns(observations)
      searchRepo.populate(Arg.any(), Arg.any(), Arg.any()).resolves(0)
      const indexEventObservations = IndexEventObservations(eventRepo, obsRepoFactory, searchRepo, log)

      await indexEventObservations(event)

      expect(closed).to.be.true
    })

    it('marks the event pending again if indexing throws', async function() {

      const event = eventAttrsStub()
      eventRepo.claimIndexing(event.id).resolves(true)
      obsRepo.iterate(Arg.any()).mimicks(() => { throw new Error('boom') })
      const indexEventObservations = IndexEventObservations(eventRepo, obsRepoFactory, searchRepo, log)

      await indexEventObservations(event)

      eventRepo.received(1).update({ id: event.id, observationSearchStatus: 'pending' })
      eventRepo.didNotReceive().update({ id: event.id, observationSearchStatus: 'indexed' })
    })
  })

  describe('indexAllEvents', function() {

    it('indexes every event', async function() {

      const event1 = eventAttrsStub({ id: 1 })
      const event2 = eventAttrsStub({ id: 2 })
      eventRepo.findAll().resolves([ event1, event2 ])
      const indexed: MageEventAttrs[] = []
      const indexEventObservations = async (event: MageEventAttrs) => { indexed.push(event) }

      await indexAllEvents(eventRepo, indexEventObservations)

      expect(indexed).to.deep.equal([ event1, event2 ])
    })

    it('resets a stale running status before indexing', async function() {

      const event = eventAttrsStub({ observationSearchStatus: 'running' })
      eventRepo.findAll().resolves([ event ])
      const indexEventObservations = async () => {}

      await indexAllEvents(eventRepo, indexEventObservations)

      eventRepo.received(1).update({ id: event.id, observationSearchStatus: 'pending' })
    })

    it('does not reset status for events that are not running', async function() {

      const event = eventAttrsStub({ observationSearchStatus: 'indexed' })
      eventRepo.findAll().resolves([ event ])
      const indexEventObservations = async () => {}

      await indexAllEvents(eventRepo, indexEventObservations)

      eventRepo.didNotReceive().update(Arg.any())
    })

    it('passes the force flag to each indexing call', async function() {

      const event = eventAttrsStub()
      eventRepo.findAll().resolves([ event ])
      const forceFlags: (boolean | undefined)[] = []
      const indexEventObservations = async (e: MageEventAttrs, force?: boolean) => { forceFlags.push(force) }

      await indexAllEvents(eventRepo, indexEventObservations, true)

      expect(forceFlags).to.deep.equal([ true ])
    })
  })

  describe('SearchIndexAllEvents', function() {

    let permissions: SubstituteOf<api.SearchIndexPermissionService>
    let searchIndexAllEvents: api.SearchIndexAllEvents
    let indexed: MageEventAttrs[]
    let indexEventObservations: api.IndexEventObservations

    beforeEach(function() {
      permissions = Sub.for<api.SearchIndexPermissionService>()
      indexed = []
      indexEventObservations = async (event: MageEventAttrs) => { indexed.push(event) }
      eventRepo.findAll().resolves([ eventAttrsStub() ])
      searchIndexAllEvents = SearchIndexAllEvents(permissions, eventRepo, indexEventObservations)
    })

    it('fails without permission', async function() {

      permissions.ensureSearchIndexAllPermission(Arg.any()).resolves(permissionDenied('search index all', 'test1'))
      const res = await searchIndexAllEvents({ context: contextStub() })

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })

    it('kicks off indexing for all events and returns success', async function() {

      permissions.ensureSearchIndexAllPermission(Arg.any()).resolves(null)

      const res = await searchIndexAllEvents({ context: contextStub() })

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal({})
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(indexed).to.have.length(1)
    })
  })

  describe('SearchIndexEvent', function() {

    let permissions: SubstituteOf<api.SearchIndexPermissionService>
    let searchIndexEvent: api.SearchIndexEvent
    let indexed: MageEventAttrs[]
    let indexEventObservations: api.IndexEventObservations

    beforeEach(function() {
      permissions = Sub.for<api.SearchIndexPermissionService>()
      indexed = []
      indexEventObservations = async (event: MageEventAttrs) => { indexed.push(event) }
      searchIndexEvent = SearchIndexEvent(permissions, eventRepo, indexEventObservations)
    })

    it('fails without permission', async function() {

      permissions.ensureSearchIndexEventPermission(Arg.any()).resolves(permissionDenied('search index event', 'test1'))
      const res = await searchIndexEvent({ context: contextStub(), eventId: 1 })

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })

    it('fails when the event does not exist', async function() {

      permissions.ensureSearchIndexEventPermission(Arg.any()).resolves(null)
      eventRepo.findById(1).resolves(null)
      const res = await searchIndexEvent({ context: contextStub(), eventId: 1 })

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrEntityNotFound)
    })

    it('kicks off indexing for the event', async function() {

      const event = new MageEvent(eventAttrsStub({ id: 1 }))
      permissions.ensureSearchIndexEventPermission(Arg.any()).resolves(null)
      eventRepo.findById(1).resolves(event)

      const res = await searchIndexEvent({ context: contextStub(), eventId: 1 })

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal({})
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(indexed).to.deep.equal([ event ])
    })

    it('resets a stale running status before indexing so a crashed run does not get stuck forever', async function() {

      const event = new MageEvent(eventAttrsStub({ id: 1, observationSearchStatus: 'running' }))
      permissions.ensureSearchIndexEventPermission(Arg.any()).resolves(null)
      eventRepo.findById(1).resolves(event)

      const res = await searchIndexEvent({ context: contextStub(), eventId: 1 })

      expect(res.error).to.be.null
      eventRepo.received(1).update({ id: 1, observationSearchStatus: 'pending' })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(indexed).to.deep.equal([ event ])
    })

    it('does not reset status when the event is not stuck running', async function() {

      const event = new MageEvent(eventAttrsStub({ id: 1, observationSearchStatus: 'indexed' }))
      permissions.ensureSearchIndexEventPermission(Arg.any()).resolves(null)
      eventRepo.findById(1).resolves(event)

      await searchIndexEvent({ context: contextStub(), eventId: 1 })

      eventRepo.didNotReceive().update(Arg.any())
    })
  })

  describe('registerObservationSavedHandler', function() {

    it('saves the observation to the search repository when an ObservationSaved event fires', async function() {

      const domainEvents = new EventEmitter()
      registerObservationSavedHandler(domainEvents, searchRepo)

      const observationAttrs: ObservationAttrs = {
        id: uniqid(),
        eventId: 1,
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 0, 0 ] },
        createdAt: new Date(),
        lastModified: new Date(),
        properties: { timestamp: new Date(), forms: [] },
        states: [],
        favoriteUserIds: [],
        attachments: [],
      }
      let saved: ObservationAttrs | null = null
      searchRepo.save(Arg.any()).mimicks(async (obs: ObservationAttrs) => { saved = obs })

      domainEvents.emit(ObservationDomainEventType.ObservationSaved, { type: ObservationDomainEventType.ObservationSaved, observation: observationAttrs })
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(saved).to.deep.equal(observationAttrs)
    })
  })
})
