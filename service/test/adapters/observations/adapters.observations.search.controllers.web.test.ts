import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { permissionDenied, entityNotFound } from '../../../lib/app.api/app.api.errors'
import { SearchIndexAppLayer, SearchIndexRoutes } from '../../../lib/adapters/observations/adapters.observations.search.controllers.web'
import { AppRequest } from '../../../lib/app.api/app.api.global'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const basePath = '/search-index-test'
const testUser = 'lummytin'

describe('search index web controller', function () {

  let createAppRequest: WebAppRequestFactory<AppRequest<UserWithRole>>
  let app: SubstituteOf<SearchIndexAppLayer>
  let webApp: express.Application
  let client: supertest.SuperTest<supertest.Test>
  let context: AppRequest<UserWithRole>['context']

  beforeEach(function () {
    context = {
      requestToken: Symbol(),
      requestingPrincipal(): typeof testUser { return testUser as any },
      locale() { return null }
    } as any
    createAppRequest = <P extends object = {}>(webReq: express.Request, params?: P) => {
      return { context, ...(params || {} as P) }
    }
    app = Sub.for<SearchIndexAppLayer>()
    const routes = SearchIndexRoutes(app, createAppRequest)
    webApp = express().use(basePath, routes)
    client = supertest(webApp)
  })

  describe('POST /events', function () {

    it('kicks off indexing for all events', async function () {

      app.searchIndexAll(Arg.any()).resolves(AppResponse.success({}))

      const res = await client.post(`${basePath}/events`)

      expect(res.status).to.equal(202)
      app.received(1).searchIndexAll(Arg.any())
    })

    it('returns 403 without permission', async function () {

      app.searchIndexAll(Arg.any()).resolves(AppResponse.error(permissionDenied('search index all', testUser)))

      const res = await client.post(`${basePath}/events`)

      expect(res.status).to.equal(403)
    })
  })

  describe('POST /events/:eventId', function () {

    it('kicks off indexing for the given event', async function () {

      app.searchIndexEvent(Arg.any()).resolves(AppResponse.success({}))

      const res = await client.post(`${basePath}/events/42`)

      expect(res.status).to.equal(202)
      app.received(1).searchIndexEvent(Arg.is(req => req.eventId === 42))
    })

    it('returns 400 when the event id is not a number', async function () {

      const res = await client.post(`${basePath}/events/not-a-number`)

      expect(res.status).to.equal(400)
      app.didNotReceive().searchIndexEvent(Arg.any())
    })

    it('returns 403 without permission', async function () {

      app.searchIndexEvent(Arg.any()).resolves(AppResponse.error(permissionDenied('search index event', testUser)))

      const res = await client.post(`${basePath}/events/42`)

      expect(res.status).to.equal(403)
    })

    it('returns 404 when the event does not exist', async function () {

      app.searchIndexEvent(Arg.any()).resolves(AppResponse.error(entityNotFound(42, 'Event')))

      const res = await client.post(`${basePath}/events/42`)

      expect(res.status).to.equal(404)
    })
  })
})
