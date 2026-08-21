import { describe, it } from 'mocha'
import { expect } from 'chai'
import express from 'express'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { permissionDenied, infrastructureError } from '../../../lib/app.api/app.api.errors'
import {
  UserLocationAppLayer,
  UserLocationRoutes,
  UserLocationWebAppRequestFactory,
} from '../../../lib/adapters/locations/adapters.locations.controllers.web'
import {
  UserLocationRequest,
  ExoUserLocation,
  ExoRecentUserLocations,
} from '../../../lib/app.api/locations/app.api.locations'
import { pageOf } from '../../../lib/entities/entities.global'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const root = '/test/events/1/locations'
const jsonMimeType = /^application\/json/

const principal = { id: 'user1', username: 'testuser' } as unknown as UserWithRole

type AppRequestFactoryHandle = { createAppRequest: UserLocationWebAppRequestFactory }

const stubAppRequestFactory: UserLocationWebAppRequestFactory = <P extends object>(_req: express.Request, params?: P): P & UserLocationRequest => {
  return {
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => principal,
      mageEvent: { id: 1 } as any,
    },
    ...(params || {} as any),
  }
}

function makeLocation(overrides?: Partial<ExoUserLocation>): ExoUserLocation {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10, 20] },
    properties: { timestamp: new Date() },
    ...overrides,
  }
}

describe('locations web controller', function() {

  let appLayer: SubstituteOf<UserLocationAppLayer>
  let appReqFactory: SubstituteOf<AppRequestFactoryHandle>
  let client: supertest.SuperTest<supertest.Test>

  beforeEach(function() {
    appLayer = Sub.for<UserLocationAppLayer>()
    appReqFactory = Sub.for<AppRequestFactoryHandle>()
    appReqFactory.createAppRequest(Arg.all()).mimicks(stubAppRequestFactory)

    const app = express().use(express.json())
    app.use(root, UserLocationRoutes(appLayer, appReqFactory.createAppRequest))
    client = supertest(app)
  })

  describe('GET / - readUserLocations', function() {

    it('returns 200 with page of locations', async function() {
      const page = pageOf([makeLocation()], { pageIndex: 0, pageSize: 10 }, 1)
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(page))

      const res = await client.get(root)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body.items).to.be.an('array').with.length(1)
    })

    it('parses startDate and endDate as Date objects', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 0, pageSize: 10 }, 0)))

      await client.get(root).query({ startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-02-01T00:00:00.000Z' })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.startDate).to.be.instanceOf(Date)
        expect(req.params.endDate).to.be.instanceOf(Date)
        return true
      }))
    })

    it('parses comma-separated users into userIsAnyOf array', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 0, pageSize: 10 }, 0)))

      await client.get(root).query({ users: 'user1,user2' })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.userIsAnyOf).to.deep.equal(['user1', 'user2'])
        return true
      }))
    })

    it('parses array users into userIsAnyOf', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 0, pageSize: 10 }, 0)))

      await client.get(root).query({ users: ['user1', 'user2'] })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.userIsAnyOf).to.deep.equal(['user1', 'user2'])
        return true
      }))
    })

    it('parses comma-separated teams into teamIsAnyOf array', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 0, pageSize: 10 }, 0)))

      await client.get(root).query({ teams: 'team1,team2' })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.teamIsAnyOf).to.deep.equal(['team1', 'team2'])
        return true
      }))
    })

    it('parses array teams into teamIsAnyOf', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 0, pageSize: 10 }, 0)))

      await client.get(root).query({ teams: ['team1', 'team2'] })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.teamIsAnyOf).to.deep.equal(['team1', 'team2'])
        return true
      }))
    })

    it('parses page and page_size into paging object', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.success(pageOf([], { pageIndex: 2, pageSize: 50 }, 0)))

      await client.get(root).query({ page: '2', page_size: '50' })

      appLayer.received(1).readUserLocations(Arg.is(req => {
        expect(req.params.paging).to.deep.equal({ pageIndex: 2, pageSize: 50 })
        return true
      }))
    })

    it('returns 400 for invalid startDate', async function() {
      const res = await client.get(root).query({ startDate: 'not-a-date' })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.match(/startDate/)
    })

    it('returns 400 for invalid endDate', async function() {
      const res = await client.get(root).query({ endDate: 'not-a-date' })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.match(/endDate/)
    })

    it('returns 403 on permission denied', async function() {
      appLayer.readUserLocations(Arg.all()).resolves(AppResponse.error(permissionDenied('read locations', principal.id)))

      const res = await client.get(root)

      expect(res.status).to.equal(403)
    })
  })

  describe('GET /users - readLocationsGroupedByUser', function() {

    it('returns 200 with array of recent user location groups', async function() {
      const group: ExoRecentUserLocations = { id: 'user1', userId: 'user1', locations: [makeLocation()] }
      appLayer.readLocationsGroupedByUser(Arg.all()).resolves(AppResponse.success([group]))

      const res = await client.get(`${root}/users`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.be.an('array').with.length(1)
      expect(res.body[0].userId).to.equal('user1')
    })

    it('parses limit as integer and populate as boolean', async function() {
      appLayer.readLocationsGroupedByUser(Arg.all()).resolves(AppResponse.success([]))

      await client.get(`${root}/users`).query({ limit: '5', populate: 'true' })

      appLayer.received(1).readLocationsGroupedByUser(Arg.is(req => {
        expect(req.params.limit).to.equal(5)
        expect(req.params.populate).to.equal(true)
        return true
      }))
    })

    it('parses comma-separated users into userIsAnyOf array', async function() {
      appLayer.readLocationsGroupedByUser(Arg.all()).resolves(AppResponse.success([]))

      await client.get(`${root}/users`).query({ users: 'user1,user2' })

      appLayer.received(1).readLocationsGroupedByUser(Arg.is(req => {
        expect(req.params.userIsAnyOf).to.deep.equal(['user1', 'user2'])
        return true
      }))
    })

    it('parses comma-separated teams into teamIsAnyOf array', async function() {
      appLayer.readLocationsGroupedByUser(Arg.all()).resolves(AppResponse.success([]))

      await client.get(`${root}/users`).query({ teams: 'team1,team2' })

      appLayer.received(1).readLocationsGroupedByUser(Arg.is(req => {
        expect(req.params.teamIsAnyOf).to.deep.equal(['team1', 'team2'])
        return true
      }))
    })

    it('returns 400 for invalid startDate', async function() {
      const res = await client.get(`${root}/users`).query({ startDate: 'bad' })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.match(/startDate/)
    })

    it('returns 403 on permission denied', async function() {
      appLayer.readLocationsGroupedByUser(Arg.all()).resolves(AppResponse.error(permissionDenied('read locations', principal.id)))

      const res = await client.get(`${root}/users`)

      expect(res.status).to.equal(403)
    })
  })

  describe('POST / - saveUserLocations', function() {

    it('returns 200 with saved locations', async function() {
      const loc = makeLocation()
      appLayer.saveUserLocations(Arg.all()).resolves(AppResponse.success([loc]))

      const res = await client.post(root).send([loc])

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.be.an('array').with.length(1)
    })

    it('wraps a single location object in an array', async function() {
      const loc = makeLocation()
      appLayer.saveUserLocations(Arg.all()).resolves(AppResponse.success([loc]))

      const res = await client.post(root).send(loc)

      expect(res.status).to.equal(200)
      expect(res.body).to.be.an('array').with.length(1)
    })

    it('returns 400 when geometry is missing', async function() {
      const res = await client.post(root).send([{ properties: { timestamp: new Date().toISOString() } }])

      expect(res.status).to.equal(400)
      expect(res.body.message).to.match(/geometry/)
    })

    it('returns 400 when timestamp is missing', async function() {
      const res = await client.post(root).send([{ geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }])

      expect(res.status).to.equal(400)
      expect(res.body.message).to.match(/timestamp/)
    })

    it('returns 403 on permission denied', async function() {
      appLayer.saveUserLocations(Arg.all()).resolves(AppResponse.error(permissionDenied('create location', principal.id)))

      const res = await client.post(root).send([makeLocation()])

      expect(res.status).to.equal(403)
    })

    it('returns 500 on infrastructure error', async function() {
      appLayer.saveUserLocations(Arg.all()).resolves(AppResponse.error(infrastructureError('db connection lost')))

      const res = await client.post(root).send([makeLocation()])

      expect(res.status).to.equal(500)
    })
  })
})
