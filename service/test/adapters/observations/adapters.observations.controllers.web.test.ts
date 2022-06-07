import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import _ from 'lodash'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { PermissionDeniedError, permissionDenied } from '../../../lib/app.api/app.api.errors'
import { ObservationAppLayer, ObservationRoutes, ObservationWebAppRequestFactory } from '../../../lib/adapters/observations/adapters.observations.controllers.web'
import { EventScopedObservationRepository, ObservationId } from '../../../lib/entities/observations/entities.observations'
import { ObservationRequest } from '../../../lib/app.api/observations/app.api.observations'

const hostUrl = 'http://mage.test'
const basePath = '/observations-test'
const baseUrl = `${hostUrl}${basePath}`
const jsonMimeType = /^application\/json/
const testUser = 'lummytin'

describe('observations web controller', function () {

  let createAppRequest: ObservationWebAppRequestFactory
  let app: SubstituteOf<ObservationAppLayer>
  let webApp: express.Application
  let client: supertest.SuperTest<supertest.Test>
  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>

  beforeEach(function() {
    mageEvent = new MageEvent({
      id: Date.now(),
      name: 'Test Obsevation Web Layer',
      forms: [],
      feedIds: [],
      layerIds: [],
      acl: {},
      style: {}
    })
    obsRepo = Sub.for<EventScopedObservationRepository>()
    createAppRequest = <P extends { context?: never } = {}>(webReq: express.Request, params?: P): ObservationRequest & P => {
      return {
        context: {
          requestToken: Symbol(),
          requestingPrincipal(): typeof testUser {
            return testUser
          },
          locale() { return null },
          mageEvent,
          observationRepository: obsRepo
        },
        ...(params || {})
      } as ObservationRequest & P
    }
    app = Sub.for<ObservationAppLayer>()
    const routes = ObservationRoutes(app, createAppRequest)
    webApp = express()
      .use((req, res, next) => {
        req.getRoot = () => hostUrl
        next()
      })
      .use(`${basePath}/events/:eventId/observations`, routes)
    client = supertest(webApp)
  })

  describe('POST /observations/id', function() {

    it('allocates an observation id', async function() {

      const observationId = uniqid()
      app.allocateObservationId(Arg.any()).resolves(AppResponse.success(observationId))
      const res = await client.post(`${basePath}/events/${mageEvent.id}/observations/id`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(201)
      expect(res.type).to.match(jsonMimeType)
      expect(res.headers['location']).to.equal(`${basePath}/events/${mageEvent.id}/observations/${observationId}`)
      // TODO: stop using the url property in the response; either remove
      // completely or change to a relative path
      expect(res.body).to.deep.equal({
        id: observationId,
        eventId: mageEvent.id,
        url: `${baseUrl}/events/${mageEvent.id}/observations/${observationId}`
      })
    })

    it('returns 403 without permission', async function() {

      app.allocateObservationId(Arg.any()).resolves(AppResponse.error(permissionDenied('create', testUser)))
      const res = await client.post(`${basePath}/events/${mageEvent.id}/observations/id`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
    })
  })
})