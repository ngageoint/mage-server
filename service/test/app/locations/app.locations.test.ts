import { describe, it } from 'mocha'
import { expect } from 'chai'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import EventEmitter from 'events'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors'
import * as api from '../../../lib/app.api/locations/app.api.locations'
import * as impl from '../../../lib/app.impl/locations/app.impl.locations'
import {
  UserLocationRepository,
  RecentUserLocationsRepository,
  UserLocationDomainEventType,
  UserLocation,
  RecentUserLocations,
} from '../../../lib/entities/locations/entities.locations'
import { TeamRepository } from '../../../lib/entities/teams/entities.teams'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { pageOf } from '../../../lib/entities/entities.global'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const eventId = 1
const userId = 'user1'

const principal = { id: userId, username: 'testuser' } as unknown as UserWithRole

const mageEvent = { id: eventId } as MageEvent

function createContext(): api.UserLocationRequestContext {
  return {
    requestToken: Symbol(),
    requestingPrincipal: () => principal,
    mageEvent,
    locale: () => null,
  }
}

function createLocation(overrides?: Partial<api.ExoUserLocation>): api.ExoUserLocation {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10, 20] },
    properties: { timestamp: new Date() },
    ...overrides,
  }
}

function createUserLocation(overrides?: Partial<UserLocation>): UserLocation {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10, 20] },
    userId,
    eventId,
    properties: { timestamp: new Date() },
    ...overrides,
  }
}

describe('exoLocationUserFor', function() {

  it('returns undefined when given undefined', function() {
    expect(api.exoLocationUserFor(undefined)).to.be.undefined
  })

  it('maps id and displayName', function() {
    const user = { id: 'u1', displayName: 'Test User' }
    const result = api.exoLocationUserFor(user)
    expect(result!.id).to.equal('u1')
    expect(result!.displayName).to.equal('Test User')
  })

  it('sets iconUrl when icon has a relativePath', function() {
    const user = { id: 'u1', displayName: 'Test User', icon: { type: 'upload' as any, text: '', color: '', relativePath: 'icons/u1.png' } }
    const result = api.exoLocationUserFor(user)
    expect(result!.iconUrl).to.equal('/api/users/u1/icon')
  })

  it('omits iconUrl when icon has no relativePath', function() {
    const user = { id: 'u1', displayName: 'Test User', icon: { type: 'none' as any, text: '', color: '' } }
    const result = api.exoLocationUserFor(user)
    expect(result!.iconUrl).to.be.undefined
  })

  it('omits iconUrl when icon is absent', function() {
    const user = { id: 'u1', displayName: 'Test User' }
    expect(api.exoLocationUserFor(user)!.iconUrl).to.be.undefined
  })

  it('does not include extra fields from the source object', function() {
    const user = { id: 'u1', displayName: 'Test User', _id: 'should-not-appear', toObject: () => {} } as any
    const result = api.exoLocationUserFor(user)
    expect(result).to.not.have.property('_id')
    expect(result).to.not.have.property('toObject')
  })
})

describe('ExoRecentUserLocationsFor', function() {

  it('includes user when present', function() {
    const from: RecentUserLocations = {
      userId: 'u1',
      eventId: 1,
      locations: [],
      user: { id: 'u1', displayName: 'Test User' },
    }
    const result = api.ExoRecentUserLocationsFor(from)
    expect(result.user).to.deep.equal({ id: 'u1', displayName: 'Test User', iconUrl: undefined })
  })

  it('user is undefined when not present', function() {
    const from: RecentUserLocations = { userId: 'u1', eventId: 1, locations: [] }
    const result = api.ExoRecentUserLocationsFor(from)
    expect(result.user).to.be.undefined
  })

  it('sets both id and userId from userId', function() {
    const from: RecentUserLocations = { userId: 'u1', eventId: 1, locations: [] }
    const result = api.ExoRecentUserLocationsFor(from)
    expect(result.id).to.equal('u1')
    expect(result.userId).to.equal('u1')
  })
})

describe('locations app layer', function() {

  let permissionService: SubstituteOf<api.UserLocationPermissionService>
  let locationRepo: SubstituteOf<UserLocationRepository>
  let recentLocationRepo: SubstituteOf<RecentUserLocationsRepository>
  let teamRepo: SubstituteOf<TeamRepository>
  let domainEvents: EventEmitter

  beforeEach(function() {
    permissionService = Sub.for<api.UserLocationPermissionService>()
    locationRepo = Sub.for<UserLocationRepository>()
    recentLocationRepo = Sub.for<RecentUserLocationsRepository>()
    teamRepo = Sub.for<TeamRepository>()
    domainEvents = new EventEmitter()
  })

  describe('ReadAllUserLocations', function() {

    let readUserLocations: api.ReadUserLocations

    beforeEach(function() {
      readUserLocations = impl.ReadAllUserLocations(permissionService, teamRepo, locationRepo)
    })

    it('returns permission denied without querying repo', async function() {
      const req: api.ReadUserLocationsRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(permissionDenied('read locations', userId))

      const res = await readUserLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      locationRepo.didNotReceive().getUserLocations(Arg.any())
    })

    it('returns page of locations on success', async function() {
      const loc = createUserLocation()
      const page = pageOf([loc], { pageIndex: 0, pageSize: 10 }, 1)
      const req: api.ReadUserLocationsRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      locationRepo.getUserLocations(Arg.all()).resolves(page)

      const res = await readUserLocations(req)

      expect(res.error).to.be.null
      expect(res.success?.items).to.have.length(1)
    })

    it('passes eventId from context to repo', async function() {
      const req: api.ReadUserLocationsRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      locationRepo.getUserLocations(Arg.all()).resolves(pageOf([], { pageIndex: 0, pageSize: 10 }, 0))

      await readUserLocations(req)

      locationRepo.received(1).getUserLocations(Arg.is(spec => spec.where.eventId === eventId))
    })

    it('passes startDate and endDate as timestampAfter/Before to repo', async function() {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-02-01')
      const req: api.ReadUserLocationsRequest = { context: createContext(), params: { startDate, endDate } }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      locationRepo.getUserLocations(Arg.all()).resolves(pageOf([], { pageIndex: 0, pageSize: 10 }, 0))

      await readUserLocations(req)

      locationRepo.received(1).getUserLocations(Arg.is(spec => {
        expect(spec.where.timestampAfter).to.deep.equal(startDate)
        expect(spec.where.timestampBefore).to.deep.equal(endDate)
        return true
      }))
    })

    it('passes userIsAnyOf directly when no teams', async function() {
      const req: api.ReadUserLocationsRequest = { context: createContext(), params: { userIsAnyOf: ['u1', 'u2'] } }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      locationRepo.getUserLocations(Arg.all()).resolves(pageOf([], { pageIndex: 0, pageSize: 10 }, 0))

      await readUserLocations(req)

      locationRepo.received(1).getUserLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.deep.equal(['u1', 'u2'])
        return true
      }))
    })

    it('expands teamIsAnyOf to user ids and merges with userIsAnyOf', async function() {
      const req: api.ReadUserLocationsRequest = {
        context: createContext(),
        params: { userIsAnyOf: ['u1'], teamIsAnyOf: ['team1'] }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      teamRepo.findAllByIds(['team1']).resolves({ team1: { id: 'team1', name: 'Team 1', userIds: ['u2', 'u3'] } as any })
      locationRepo.getUserLocations(Arg.all()).resolves(pageOf([], { pageIndex: 0, pageSize: 10 }, 0))

      await readUserLocations(req)

      locationRepo.received(1).getUserLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.have.members(['u1', 'u2', 'u3'])
        return true
      }))
    })

    it('deduplicates user ids when user appears in both userIsAnyOf and a team', async function() {
      const req: api.ReadUserLocationsRequest = {
        context: createContext(),
        params: { userIsAnyOf: ['u1'], teamIsAnyOf: ['team1'] }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      teamRepo.findAllByIds(['team1']).resolves({ team1: { id: 'team1', name: 'Team 1', userIds: ['u1', 'u2'] } as any })
      locationRepo.getUserLocations(Arg.all()).resolves(pageOf([], { pageIndex: 0, pageSize: 10 }, 0))

      await readUserLocations(req)

      locationRepo.received(1).getUserLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.have.members(['u1', 'u2'])
        expect(spec.where.userIsAnyOf).to.have.length(2)
        return true
      }))
    })
  })

  describe('ReadLocationsGroupedByUser', function() {

    let readLocationsGroupedByUser: api.ReadLocationsGroupedByUser

    beforeEach(function() {
      readLocationsGroupedByUser = impl.ReadLocationsGroupedByUser(permissionService, teamRepo, recentLocationRepo)
    })

    it('returns permission denied without querying repo', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(permissionDenied('read locations', userId))

      const res = await readLocationsGroupedByUser(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      recentLocationRepo.didNotReceive().findLocations(Arg.any())
    })

    it('returns grouped locations on success', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      recentLocationRepo.findLocations(Arg.all()).resolves([
        { userId, eventId, locations: [createUserLocation()] }
      ])

      const res = await readLocationsGroupedByUser(req)

      expect(res.error).to.be.null
      expect(res.success).to.have.length(1)
      expect(res.success![0].userId).to.equal(userId)
    })

    it('passes eventId from context to repo', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = { context: createContext(), params: {} }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      recentLocationRepo.findLocations(Arg.all()).resolves([])

      await readLocationsGroupedByUser(req)

      recentLocationRepo.received(1).findLocations(Arg.is(spec => spec.where.eventId === eventId))
    })

    it('passes startDate, endDate, limit, and populate to repo', async function() {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-02-01')
      const req: api.ReadLocationsGroupedByUserRequest = {
        context: createContext(),
        params: { startDate, endDate, limit: 5, populate: true }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      recentLocationRepo.findLocations(Arg.all()).resolves([])

      await readLocationsGroupedByUser(req)

      recentLocationRepo.received(1).findLocations(Arg.is(spec => {
        expect(spec.where.timestampAfter).to.deep.equal(startDate)
        expect(spec.where.timestampBefore).to.deep.equal(endDate)
        expect(spec.limit).to.equal(5)
        expect(spec.populate).to.equal(true)
        return true
      }))
    })

    it('passes userIsAnyOf directly when no teams', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = {
        context: createContext(),
        params: { userIsAnyOf: ['u1', 'u2'] }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      recentLocationRepo.findLocations(Arg.all()).resolves([])

      await readLocationsGroupedByUser(req)

      recentLocationRepo.received(1).findLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.deep.equal(['u1', 'u2'])
        return true
      }))
    })

    it('expands teamIsAnyOf to user ids and merges with userIsAnyOf', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = {
        context: createContext(),
        params: { userIsAnyOf: ['u1'], teamIsAnyOf: ['team1'] }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      teamRepo.findAllByIds(['team1']).resolves({ team1: { id: 'team1', name: 'Team 1', userIds: ['u2', 'u3'] } as any })
      recentLocationRepo.findLocations(Arg.all()).resolves([])

      await readLocationsGroupedByUser(req)

      recentLocationRepo.received(1).findLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.have.members(['u1', 'u2', 'u3'])
        return true
      }))
    })

    it('deduplicates user ids when user appears in both userIsAnyOf and a team', async function() {
      const req: api.ReadLocationsGroupedByUserRequest = {
        context: createContext(),
        params: { userIsAnyOf: ['u1'], teamIsAnyOf: ['team1'] }
      }
      permissionService.ensureReadLocationPermission(Arg.all()).resolves(null)
      teamRepo.findAllByIds(['team1']).resolves({ team1: { id: 'team1', name: 'Team 1', userIds: ['u1', 'u2'] } as any })
      recentLocationRepo.findLocations(Arg.all()).resolves([])

      await readLocationsGroupedByUser(req)

      recentLocationRepo.received(1).findLocations(Arg.is(spec => {
        expect(spec.where.userIsAnyOf).to.have.members(['u1', 'u2'])
        expect(spec.where.userIsAnyOf).to.have.length(2)
        return true
      }))
    })
  })

  describe('SaveUserLocations', function() {

    let saveUserLocations: api.SaveUserLocations

    beforeEach(function() {
      saveUserLocations = impl.SaveUserLocations(permissionService, locationRepo, recentLocationRepo, domainEvents)
    })

    it('returns permission denied without saving', async function() {
      const req: api.SaveUserLocationsRequest = { context: createContext(), locations: [createLocation()] }
      permissionService.ensureCreateLocationPermission(Arg.all()).resolves(permissionDenied('create location', userId))

      const res = await saveUserLocations(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      locationRepo.didNotReceive().save(Arg.any())
      recentLocationRepo.didNotReceive().addLocations(Arg.any())
    })

    it('saves locations and returns them', async function() {
      const saved = [createUserLocation()]
      const req: api.SaveUserLocationsRequest = { context: createContext(), locations: [createLocation()] }
      permissionService.ensureCreateLocationPermission(Arg.all()).resolves(null)
      locationRepo.save(Arg.all()).resolves(saved)
      recentLocationRepo.addLocations(Arg.all()).resolves({ userId, eventId, locations: saved })

      const res = await saveUserLocations(req)

      expect(res.error).to.be.null
      expect(res.success).to.have.length(1)
    })

    it('stamps eventId and userId from context onto each location before saving', async function() {
      const req: api.SaveUserLocationsRequest = { context: createContext(), locations: [createLocation()] }
      permissionService.ensureCreateLocationPermission(Arg.all()).resolves(null)
      locationRepo.save(Arg.all()).resolves([createUserLocation()])
      recentLocationRepo.addLocations(Arg.all()).resolves({ userId, eventId, locations: [] })

      await saveUserLocations(req)

      locationRepo.received(1).save(Arg.is(locs => {
        expect(locs[0].userId).to.equal(userId)
        expect(locs[0].eventId).to.equal(eventId)
        return true
      }))
    })

    it('adds saved locations to recent locations repo', async function() {
      const req: api.SaveUserLocationsRequest = { context: createContext(), locations: [createLocation()] }
      permissionService.ensureCreateLocationPermission(Arg.all()).resolves(null)
      locationRepo.save(Arg.all()).resolves([createUserLocation()])
      recentLocationRepo.addLocations(Arg.all()).resolves({ userId, eventId, locations: [] })

      await saveUserLocations(req)

      recentLocationRepo.received(1).addLocations(Arg.is(spec => {
        expect(spec.userId).to.equal(userId)
        expect(spec.eventId).to.equal(eventId)
        return true
      }))
    })

    it('emits a LocationSaved domain event after saving', async function() {
      const saved = [createUserLocation()]
      const req: api.SaveUserLocationsRequest = { context: createContext(), locations: [createLocation()] }
      permissionService.ensureCreateLocationPermission(Arg.all()).resolves(null)
      locationRepo.save(Arg.all()).resolves(saved)
      recentLocationRepo.addLocations(Arg.all()).resolves({ userId, eventId, locations: saved })

      let emittedEvent: any = null
      domainEvents.on(UserLocationDomainEventType.LocationSaved, e => { emittedEvent = e })

      await saveUserLocations(req)

      expect(emittedEvent).to.exist
      expect(emittedEvent.type).to.equal(UserLocationDomainEventType.LocationSaved)
      expect(emittedEvent.locations).to.have.length(1)
    })
  })
})
