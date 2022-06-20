import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import _ from 'lodash'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { permissionDenied, entityNotFound, invalidInput } from '../../../lib/app.api/app.api.errors'
import { jsonForObservation, ObservationAppLayer, ObservationRoutes, ObservationWebAppRequestFactory } from '../../../lib/adapters/observations/adapters.observations.controllers.web'
import { EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, validationResultMessage } from '../../../lib/entities/observations/entities.observations'
import { ExoObservation, ExoObservationMod, ObservationRequest, ObservationRequestContext, SaveObservationRequest } from '../../../lib/app.api/observations/app.api.observations'
import { Geometry, Point } from 'geojson'

const hostUrl = 'http://mage.test'
const basePath = '/observations-test'
const baseUrl = `${hostUrl}${basePath}`
const jsonMediaType = /^application\/json/
const testUser = 'lummytin'

describe('observations web controller', function () {

  let createAppRequest: ObservationWebAppRequestFactory
  let app: SubstituteOf<ObservationAppLayer>
  let webApp: express.Application
  let client: supertest.SuperTest<supertest.Test>
  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let context: ObservationRequestContext

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
    context = {
      requestToken: Symbol(),
      requestingPrincipal(): typeof testUser {
        return testUser
      },
      locale() { return null },
      mageEvent,
      userId: uniqid(),
      deviceId: uniqid(),
      observationRepository: obsRepo
    }
    createAppRequest = <P extends { context?: never } = {}>(webReq: express.Request, params?: P): ObservationRequest & P => {
      return { context, ...(params || {} as P) }
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

  describe('observation response json', function() {

    it('is exo observation with urls added', function() {

      const obs: ExoObservation = {
        id: uniqid(),
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date(),
          forms: [
            { id: uniqid(), formId: 6, field1: 'lutrut' },
          ]
        },
        state: { id: uniqid(), name: 'active', userId: uniqid() },
        favoriteUserIds: [ uniqid(), uniqid() ],
        attachments: [
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field2', oriented: false, contentStored: true },
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field2', oriented: false, contentStored: true }
        ]
      }
      const obsWeb = jsonForObservation(obs, `${baseUrl}/events/${mageEvent.id}/observations`)
      const withoutUrls = _.omit(
        {
          ...obsWeb,
          state: _.omit(obsWeb.state, 'url'),
          attachments: obsWeb.attachments.map(x => _.omit(x, 'url'))
        }, 'url')

      expect(withoutUrls).to.deep.equal(obs)
      expect(obsWeb.url).to.equal(`${baseUrl}/events/${mageEvent.id}/observations/${obs.id}`)
      expect(obsWeb.state?.url).to.equal(`${baseUrl}/events/${mageEvent.id}/observations/${obs.id}/states/${obs.state?.id as string}`)
      expect(obsWeb.attachments[0].url).to.equal(`${baseUrl}/events/${mageEvent.id}/observations/${obs.id}/attachments/${obs.attachments[0].id}`)
      expect(obsWeb.attachments[1].url).to.equal(`${baseUrl}/events/${mageEvent.id}/observations/${obs.id}/attachments/${obs.attachments[1].id}`)
    })

    it('omits attachment url if content is not stored', function() {

      const obs: ExoObservation = {
        id: uniqid(),
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date(),
          forms: []
        },
        favoriteUserIds: [],
        attachments: [
          { id: uniqid(), observationFormId: uniqid(), fieldName: 'field2', oriented: false, contentStored: false }
        ]
      }
      const obsWeb = jsonForObservation(obs, `https://test.mage/events/${mageEvent.id}/observations`)

      expect(obsWeb.attachments[0].url).to.be.undefined
    })
  })

  describe('POST /id', function() {

    it('allocates an observation id', async function() {

      const observationId = uniqid()
      app.allocateObservationId(Arg.any()).resolves(AppResponse.success(observationId))
      const res = await client.post(`${basePath}/events/${mageEvent.id}/observations/id`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(201)
      expect(res.type).to.match(jsonMediaType)
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
      expect(res.type).to.match(jsonMediaType)
    })
  })

  describe('PUT /observations/{observationId}', function() {

    it('saves the observation for a mod request', async function() {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { formId: 357, field1: 'new form entry', field2: 'wimwam' },
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        }
      }
      const mod: ExoObservationMod = {
        id: obsId,
        type: 'Feature',
        geometry: reqBody.geometry as Geometry,
        properties: {
          timestamp: new Date(reqBody.properties.timestamp),
          forms: reqBody.properties.forms
        },
      }
      const appRes: ExoObservation = {
        id: obsId,
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: mod.geometry,
        properties: {
          timestamp: mod.properties.timestamp,
          forms: [
            { ...mod.properties.forms[0], id: uniqid() },
            mod.properties.forms[1] as FormEntry
          ]
        },
        state: { id: uniqid(), name: 'active', userId: uniqid() },
        favoriteUserIds: [],
        attachments: []
      }
      app.saveObservation(Arg.all()).resolves(AppResponse.success(appRes))
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal(JSON.parse(JSON.stringify(jsonForObservation(appRes, `${baseUrl}/events/${mageEvent.id}/observations`))))
      app.received(1).saveObservation(Arg.all())
      app.received(1).saveObservation(Arg.is(saveObservationRequestWithObservation(mod)))
    })

    it('picks only geometry and properties from the request body', async function() {

      const obsId = uniqid()
      const reqBody = {
        type: 'FeatureCollection',
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { formId: 357, field1: 'new form entry', field2: 'wimwam' },
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        },
        attachments: [
          { id: uniqid(), observationFormId: 'updated-form-entry', fieldName: 'field1' }
        ],
        otherGarbage: {
          exclude: true
        }
      }
      const mod: ExoObservationMod = {
        id: obsId,
        type: 'Feature',
        geometry: reqBody.geometry as Geometry,
        properties: {
          timestamp: new Date(reqBody.properties.timestamp),
          forms: reqBody.properties.forms
        },
      }
      const appRes: ExoObservation = {
        id: obsId,
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: mod.geometry,
        properties: {
          timestamp: mod.properties.timestamp,
          forms: [
            { ...mod.properties.forms[0], id: uniqid() },
            mod.properties.forms[1] as FormEntry
          ]
        },
        state: { id: uniqid(), name: 'active', userId: uniqid() },
        favoriteUserIds: [],
        attachments: []
      }
      app.saveObservation(Arg.all()).resolves(AppResponse.success(appRes))
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal(JSON.parse(JSON.stringify(jsonForObservation(appRes, `${baseUrl}/events/${mageEvent.id}/observations`))))
      app.received(1).saveObservation(Arg.all())
      app.received(1).saveObservation(Arg.is(saveObservationRequestWithObservation(mod)))
    })

    it('uses event id only from the path', async function() {

      const obsId = uniqid()
      const reqBody = {
        eventId: mageEvent.id + 100,
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        }
      }
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: 'Body event ID does not match path event ID' })
      app.didNotReceive().saveObservation(Arg.all())
    })

    it('uses observation id only from the path', async function() {

      const obsIdInPath = uniqid()
      const reqBody = {
        id: uniqid(),
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        }
      }
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsIdInPath}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: 'Body observation ID does not match path observation ID' })
      app.didNotReceive().saveObservation(Arg.all())
    })

    it('returns 403 without permission', async function() {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        }
      }
      const appRes = AppResponse.error(permissionDenied('save observation', 'you'))
      app.saveObservation(Arg.all()).resolves(appRes)
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `permission denied: ${appRes.error?.data.permission}` })
    })

    it('returns 404 when the observation id does not exist', async function() {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [ 23, 45 ] },
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { id: 'updated-form-entry', formId: 246, field1: 'slipslop' }
          ]
        }
      }
      const appRes = AppResponse.error(entityNotFound(obsId, 'Observation'))
      app.saveObservation(Arg.all()).resolves(appRes)
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `Observation not found: ${obsId}` })
    })

    it('returns 400 when the observation is invalid', async function() {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [ 23, 45 ] } as Point,
        properties: {
          timestamp: new Date().toISOString(),
          forms: [
            { id: 'updated-form-entry', formId: 246, field1: Date.now() }
          ]
        }
      }
      const obsAttrs: ObservationAttrs = {
        id: obsId,
        eventId: mageEvent.id,
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: reqBody.geometry,
        properties: {
          timestamp: new Date(reqBody.properties.timestamp),
          forms: reqBody.properties.forms
        },
        states: [],
        favoriteUserIds: [],
        attachments: [],
      }
      const obs = Observation.evaluate(obsAttrs, mageEvent)
      const appRes = AppResponse.error(invalidInput(validationResultMessage(obs.validation)))
      app.saveObservation(Arg.all()).resolves(appRes)
      const res = await client.put(`${basePath}/events/${mageEvent.id}/observations/${obsId}`)
        .set('accept', 'application/json')
        .send(reqBody)

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: appRes.error?.message })
      app.received(1).saveObservation(Arg.all())
    })
  })
})

function saveObservationRequestWithObservation(expected: ExoObservationMod): (actual: SaveObservationRequest) => boolean {
  return actual => {
    const actualMod = actual.observation
    expect(actualMod).to.deep.equal(expected)
    return true
  }
}