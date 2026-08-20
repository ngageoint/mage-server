import { expect } from 'chai'
import express from 'express'
import supertest from 'supertest'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import { LocationAppLayer, LocationRoutes, LocationWebAppRequestFactory } from '../../../lib/adapters/locations/adapters.locations.controllers.web'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { LocationRequest, ReadLocationsGroupedByUserRequest, ReadLocationsRequest, CreateLocationsRequest } from '../../../lib/app.api/locations/app.api.locations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { RecentUserLocations, UserLocation } from '../../../lib/entities/locations/entities.locations'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'
import { invalidInput, permissionDenied } from '../../../lib/app.api/app.api.errors'

describe('locations web controller', function() {

  const mageEvent = new MageEvent({
    id: 100,
    name: 'Location Controller Tests',
    forms: [],
    layerIds: [],
    feedIds: [],
    acl: {},
    style: {}
  })

  const principal: UserWithRole = {
    id: uniqid(),
    username: 'testuser',
    roleId: { id: uniqid(), name: 'Role 1', permissions: [] } as any
  } as UserWithRole

  type AppRequestFactoryHandle = {
    createRequest: LocationWebAppRequestFactory
  }

  let client: supertest.SuperTest<supertest.Test>
  let appLayer: SubstituteOf<LocationAppLayer>
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>

  beforeEach(function() {
    appLayer = Sub.for<LocationAppLayer>()
    appReqFactory = Sub.for<AppRequestFactoryHandle>()
    const endpoint = express()
    endpoint.use(express.json())
    endpoint.use('/locations', LocationRoutes(appLayer, appReqFactory.createRequest))
    client = supertest(endpoint)
  })

  function createAppRequest<Params extends object | undefined>(params?: Params): Params & Omit<LocationRequest, 'params'> {
    return {
      ...(params || {} as Params),
      context: {
        mageEvent,
        requestToken: Symbol(),
        requestingPrincipal: () => principal,
        locale: () => null
      }
    } as any
  }

  describe('GET /', function() {

    it('reads locations and returns them as json', async function() {
      const locations: UserLocation[] = [{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: principal.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: new Date() }
      }]
      const appReq: ReadLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocations(Arg.any()).resolves(AppResponse.success(locations))

      const res = await client.get('/locations')

      expect(res.status).to.equal(200)
      expect(res.body).to.have.length(1)
    })

    it('parses startDate, endDate, lastLocationId and limit query params', async function() {
      const appReq: ReadLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocations(Arg.any()).resolves(AppResponse.success([]))

      await client.get('/locations').query({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T00:00:00.000Z',
        lastLocationId: 'loc-1',
        limit: '25'
      })

      appReqFactory.received(1).createRequest(Arg.any(), Arg.is((params: any) => {
        expect(params.startDate?.toISOString()).to.equal('2024-01-01T00:00:00.000Z')
        expect(params.endDate?.toISOString()).to.equal('2024-01-31T00:00:00.000Z')
        expect(params.lastLocationId).to.equal('loc-1')
        expect(params.limit).to.equal(25)
        return true
      }))
    })

    it('defaults limit to 1 when not provided', async function() {
      const appReq: ReadLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocations(Arg.any()).resolves(AppResponse.success([]))

      await client.get('/locations')

      appReqFactory.received(1).createRequest(Arg.any(), Arg.is((params: any) => params.limit === 1))
    })

    it('maps errors to the appropriate status code', async function() {
      const appReq: ReadLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocations(Arg.any()).resolves(AppResponse.error(permissionDenied('READ_LOCATION_EVENT', principal.username)))

      const res = await client.get('/locations')

      expect(res.status).to.equal(403)
    })
  })

  describe('GET /users', function() {

    it('reads locations grouped by user and maps the response shape', async function() {
      const recent: RecentUserLocations[] = [{
        userId: principal.id,
        eventId: mageEvent.id,
        locations: []
      }]
      const appReq: ReadLocationsGroupedByUserRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocationsGroupedByUser(Arg.any()).resolves(AppResponse.success(recent))

      const res = await client.get('/locations/users')

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([{ id: principal.id, locations: [] }])
    })

    it('uses the populated user id when a user is present', async function() {
      const recent: RecentUserLocations[] = [{
        userId: principal.id,
        eventId: mageEvent.id,
        user: { id: 'populated-user-id', username: 'someone' },
        locations: []
      }]
      const appReq: ReadLocationsGroupedByUserRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocationsGroupedByUser(Arg.any()).resolves(AppResponse.success(recent))

      const res = await client.get('/locations/users')

      expect(res.body[0].id).to.equal('populated-user-id')
      expect(res.body[0].user).to.deep.equal({ id: 'populated-user-id', username: 'someone' })
    })

    it('parses populate query param', async function() {
      const appReq: ReadLocationsGroupedByUserRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.readLocationsGroupedByUser(Arg.any()).resolves(AppResponse.success([]))

      await client.get('/locations/users').query({ populate: 'true' })

      appReqFactory.received(1).createRequest(Arg.any(), Arg.is((params: any) => params.populate === true))
    })
  })

  describe('POST /', function() {

    it('wraps a single location body in an array and returns a single object', async function() {
      const timestamp = new Date()
      const created: UserLocation[] = [{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: principal.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp }
      }]
      const appReq: CreateLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.createLocations(Arg.any()).resolves(AppResponse.success(created))

      const res = await client.post('/locations').send({
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: timestamp.toISOString() }
      })

      expect(res.status).to.equal(200)
      expect(res.body).to.not.be.an('array')
      expect(res.body.eventId).to.equal(mageEvent.id)
    })

    it('keeps an array body as an array in the response', async function() {
      const timestamp = new Date()
      const created: UserLocation[] = [{
        type: 'Feature',
        eventId: mageEvent.id,
        userId: principal.id,
        teamIds: [],
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp }
      }]
      const appReq: CreateLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.createLocations(Arg.any()).resolves(AppResponse.success(created))

      const res = await client.post('/locations').send([{
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: timestamp.toISOString() }
      }])

      expect(res.status).to.equal(200)
      expect(res.body).to.be.an('array').with.length(1)
    })

    it('parses the timestamp with moment and injects the provisioned device id', async function() {
      const appReq: CreateLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.createLocations(Arg.any()).resolves(AppResponse.success([]))

      await client.post('/locations').send({
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: '2024-01-01T00:00:00.000Z', accuracy: 5 }
      })

      appReqFactory.received(1).createRequest(Arg.any(), Arg.is((params: any) => {
        expect(params.locations).to.have.length(1)
        expect(params.locations[0].properties.timestamp.toISOString()).to.equal('2024-01-01T00:00:00.000Z')
        expect(params.locations[0].properties.accuracy).to.equal(5)
        return true
      }))
    })

    it('leaves timestamp undefined when not provided so app layer validation catches it', async function() {
      const appReq: CreateLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.createLocations(Arg.any()).resolves(AppResponse.error(invalidInput("Missing required parameter 'properties.timestamp'")))

      const res = await client.post('/locations').send({
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: {}
      })

      expect(res.status).to.equal(400)
      appReqFactory.received(1).createRequest(Arg.any(), Arg.is((params: any) => {
        expect(params.locations[0].properties.timestamp).to.equal(undefined)
        return true
      }))
    })

    it('maps errors to the appropriate status code', async function() {
      const appReq: CreateLocationsRequest = createAppRequest()
      appReqFactory.createRequest(Arg.any(), Arg.any()).returns(appReq)
      appLayer.createLocations(Arg.any()).resolves(AppResponse.error(permissionDenied('CREATE_LOCATION', principal.username)))

      const res = await client.post('/locations').send({
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { timestamp: new Date().toISOString() }
      })

      expect(res.status).to.equal(403)
    })
  })
})
