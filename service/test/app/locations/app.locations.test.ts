import { expect } from 'chai'
import { EventEmitter } from 'events'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import * as api from '../../../lib/app.api/locations/app.api.locations'
import * as impl from '../../../lib/app.impl/locations/app.impl.locations'
import { ErrInvalidInput, ErrPermissionDenied, MageError, permissionDenied } from '../../../lib/app.api/app.api.errors'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { LocationsAddedEvent, RecentUserLocationsRepository, UserLocation, UserLocationRepository } from '../../../lib/entities/locations/entities.locations'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

describe('locations use case interactions', function() {

  let repo: SubstituteOf<UserLocationRepository>
  let recentRepo: SubstituteOf<RecentUserLocationsRepository>
  let permissions: SubstituteOf<api.LocationPermissionService>
  let domainEvents: EventEmitter
  let mageEvent: MageEvent
  let user: UserWithRole

  function requestBy<T extends object>(params?: T): api.LocationRequest<UserWithRole> & T {
    return {
      ...(params || {} as T),
      context: {
        mageEvent,
        requestToken: Symbol(),
        requestingPrincipal: () => user,
        locale: () => null
      }
    }
  }

  beforeEach(function() {
    repo = Sub.for<UserLocationRepository>()
    recentRepo = Sub.for<RecentUserLocationsRepository>()
    permissions = Sub.for<api.LocationPermissionService>()
    domainEvents = new EventEmitter()
    mageEvent = new MageEvent({
      id: 100,
      name: 'Location App Tests',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
    user = {
      id: uniqid(),
      username: 'testuser',
      roleId: { id: uniqid(), name: 'Role 1', permissions: [] } as any
    } as UserWithRole
  })

  describe('creating locations', function() {

    let createLocations: api.CreateLocations

    beforeEach(function() {
      createLocations = impl.CreateLocations(repo, recentRepo, permissions, domainEvents)
    })

    it('checks permission', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(permissionDenied('CREATE_LOCATION', user.username))

      const req: api.CreateLocationsRequest = requestBy({ locations: [] })
      const res = await createLocations(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().createLocations(Arg.all())
    })

    it('rejects a location with no geometry', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)

      const req: api.CreateLocationsRequest = requestBy({
        locations: [{ geometry: undefined as any, properties: { timestamp: new Date() } }]
      })
      const res = await createLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrInvalidInput)
      repo.didNotReceive().createLocations(Arg.all())
    })

    it('rejects a location with no properties.timestamp', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)

      const req: api.CreateLocationsRequest = requestBy({
        locations: [{ geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} as any }]
      })
      const res = await createLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrInvalidInput)
      repo.didNotReceive().createLocations(Arg.all())
    })

    it('creates locations, adds them to recent locations, and emits a domain event', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)

      const timestamp = new Date()
      const created: UserLocation[] = [{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: user.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp }
      }]
      repo.createLocations(Arg.all()).resolves(created)

      let emitted: any[] = []
      domainEvents.on(LocationsAddedEvent, (...args: any[]) => { emitted = args })

      const req: api.CreateLocationsRequest = requestBy({
        locations: [{ geometry: { type: 'Point', coordinates: [1, 2] }, properties: { timestamp } }]
      })
      const res = await createLocations(req)

      expect(res.error).to.be.null
      expect(res.success).to.equal(created)
      repo.received(1).createLocations([{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: user.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp }
      }])
      recentRepo.received(1).addLocations(user.id, mageEvent.id, created)
      expect(emitted).to.deep.equal([created, user, mageEvent])
    })

    it('maps every location in a multi-location request to the repository stub', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)

      const timestampA = new Date('2024-01-01T00:00:00.000Z')
      const timestampB = new Date('2024-01-02T00:00:00.000Z')
      repo.createLocations(Arg.all()).resolves([])

      const req: api.CreateLocationsRequest = requestBy({
        locations: [
          { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { timestamp: timestampA } },
          { geometry: { type: 'Point', coordinates: [3, 4] }, properties: { timestamp: timestampB } }
        ]
      })
      const res = await createLocations(req)

      expect(res.error).to.be.null
      repo.received(1).createLocations([
        { type: 'Feature', eventId: mageEvent.id, userId: user.id, teamIds: [], geometry: { type: 'Point', coordinates: [1, 2] }, properties: { timestamp: timestampA } },
        { type: 'Feature', eventId: mageEvent.id, userId: user.id, teamIds: [], geometry: { type: 'Point', coordinates: [3, 4] }, properties: { timestamp: timestampB } }
      ])
    })

    it('rejects the request if any location beyond the first is missing geometry', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)

      const req: api.CreateLocationsRequest = requestBy({
        locations: [
          { geometry: { type: 'Point', coordinates: [1, 2] }, properties: { timestamp: new Date() } },
          { geometry: undefined as any, properties: { timestamp: new Date() } }
        ]
      })
      const res = await createLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrInvalidInput)
      repo.didNotReceive().createLocations(Arg.all())
    })

    it('allows an empty locations array through to the repository', async function() {
      permissions.ensureCreateLocationsPermission(Arg.any()).resolves(null)
      repo.createLocations(Arg.all()).resolves([])

      const req: api.CreateLocationsRequest = requestBy({ locations: [] })
      const res = await createLocations(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal([])
      repo.received(1).createLocations([])
      recentRepo.received(1).addLocations(user.id, mageEvent.id, [])
    })
  })

  describe('reading locations', function() {

    let readLocations: api.ReadLocations

    beforeEach(function() {
      readLocations = impl.ReadLocations(repo, permissions)
    })

    it('checks permission', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(permissionDenied('READ_LOCATION_EVENT', user.username))

      const req: api.ReadLocationsRequest = requestBy()
      const res = await readLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })

    it('returns locations from the repository', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(null)

      const locations: UserLocation[] = [{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: user.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: new Date() }
      }]
      repo.getLocations(Arg.any()).returns(asAsyncIterable(locations))

      const req: api.ReadLocationsRequest = requestBy()
      const res = await readLocations(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(locations)
    })

    it('passes the requested filter and limit through to the repository', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(null)
      repo.getLocations(Arg.any()).returns(asAsyncIterable([]))

      const startDate = new Date('2024-01-01T00:00:00.000Z')
      const endDate = new Date('2024-01-31T00:00:00.000Z')
      const req: api.ReadLocationsRequest = requestBy({
        startDate,
        endDate,
        lastLocationId: 'loc-1',
        limit: 50
      })
      await readLocations(req)

      repo.received(1).getLocations({
        filter: {
          eventId: mageEvent.id,
          startDate,
          endDate,
          lastLocationId: 'loc-1'
        },
        limit: 50
      })
    })
  })

  describe('reading locations grouped by user', function() {

    let readLocationsGroupedByUser: api.ReadLocationsGroupedByUser

    beforeEach(function() {
      readLocationsGroupedByUser = impl.ReadLocationsGroupedByUser(recentRepo, permissions)
    })

    it('checks permission', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(permissionDenied('READ_LOCATION_EVENT', user.username))

      const req: api.ReadLocationsGroupedByUserRequest = requestBy()
      const res = await readLocationsGroupedByUser(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })

    it('returns recent locations grouped by user', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(null)
      const recent = [{ userId: user.id, eventId: mageEvent.id, locations: [] }]
      recentRepo.findLocations(Arg.any()).resolves(recent)

      const req: api.ReadLocationsGroupedByUserRequest = requestBy({ populate: true, limit: 10 })
      const res = await readLocationsGroupedByUser(req)

      expect(res.error).to.be.null
      expect(res.success).to.equal(recent)
      recentRepo.received(1).findLocations(Arg.is(x => x.limit === 10 && x.populate === true && x.filter.eventId === mageEvent.id))
    })

    it('passes startDate and endDate through to the repository', async function() {
      permissions.ensureReadLocationsPermission(Arg.any()).resolves(null)
      recentRepo.findLocations(Arg.any()).resolves([])

      const startDate = new Date('2024-01-01T00:00:00.000Z')
      const endDate = new Date('2024-01-31T00:00:00.000Z')
      const req: api.ReadLocationsGroupedByUserRequest = requestBy({ startDate, endDate })
      await readLocationsGroupedByUser(req)

      recentRepo.received(1).findLocations({
        filter: { eventId: mageEvent.id, startDate, endDate },
        limit: undefined,
        populate: undefined
      })
    })
  })
})

function asAsyncIterable<T>(items: T[]): AsyncIterable<T> & { close?: () => void } {
  return {
    [Symbol.asyncIterator]() {
      let i = 0
      return {
        async next() {
          if (i < items.length) {
            return { done: false, value: items[i++] }
          }
          return { done: true, value: undefined }
        }
      }
    }
  }
}
