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
import { jsonForAttachment, jsonForObservation, ObservationAppLayer, ObservationRoutes, ObservationWebAppRequestFactory } from '../../../lib/adapters/observations/adapters.observations.controllers.web'
import { AttachmentStore, EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, ObservationFeatureProperties, validationResultMessage } from '../../../lib/entities/observations/entities.observations'
import { ExoAttachmentContent, ExoObservation, ExoObservationMod, ObservationRequest, ObservationRequestContext, SaveObservationRequest } from '../../../lib/app.api/observations/app.api.observations'
import { Geometry, Point } from 'geojson'
import { BufferWriteable } from '../../utils'
import { Readable } from 'stream'

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
  let attachmentStore: SubstituteOf<AttachmentStore>
  let context: ObservationRequestContext

  beforeEach(function () {
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
    attachmentStore = Sub.for<AttachmentStore>()
    const routes = ObservationRoutes(app, attachmentStore, createAppRequest)
    webApp = express()
      .use((req, res, next) => {
        req.getRoot = () => hostUrl
        next()
      })
      .use(`${basePath}/events/:eventId/observations`, routes)
    client = supertest(webApp)
  })

  describe('observation response json', function () {

    it('is exo observation with urls added', function () {

      const obs: ExoObservation = {
        id: uniqid(),
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [23, 45] },
        properties: {
          timestamp: new Date(),
          forms: [
            { id: uniqid(), formId: 6, field1: 'lutrut' },
          ]
        },
        state: { id: uniqid(), name: 'active', userId: uniqid() },
        favoriteUserIds: [uniqid(), uniqid()],
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

    it('omits attachment url if content is not stored', function () {

      const obs: ExoObservation = {
        id: uniqid(),
        eventId: mageEvent.id,
        user: { id: context.userId, displayName: 'Thor Odinson' },
        createdAt: new Date(),
        lastModified: new Date(),
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [23, 45] },
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

  describe('GET / and POST /search', function () {

    it('returns the array of observations for an unpaged search, mapped through the request mapping function', async function () {

      const observations: ExoObservation[] = [
        {
          id: uniqid(),
          eventId: mageEvent.id,
          createdAt: new Date(),
          lastModified: new Date(),
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ 1, 2 ] },
          properties: { timestamp: new Date(), forms: [] },
          favoriteUserIds: [],
          attachments: []
        }
      ]
      app.readObservations(Arg.any()).mimicks(async req => {
        return AppResponse.success(observations.map(req.mapping!))
      })
      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal(JSON.parse(JSON.stringify(
        observations.map(o => jsonForObservation(o, `${baseUrl}/events/${mageEvent.id}/observations`))
      )))
    })

    it('returns a page object when page_size is given', async function () {

      const page = { totalCount: 1, pageSize: 10, pageIndex: 0, items: [] as ExoObservation[] }
      app.readObservations(Arg.any()).resolves(AppResponse.success(page))
      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations?page_size=10`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal(page)
    })

    it('supports POST /search with the same body-based parameters', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      const res = await client.post(`${basePath}/events/${mageEvent.id}/observations/search`)
        .set('accept', 'application/json')
        .send({ startDate: '2020-01-01T00:00:00Z' })

      expect(res.status).to.equal(200)
      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.lastModifiedAfter).to.deep.equal(new Date('2020-01-01T00:00:00Z'))
        return true
      }))
    })

    it('parses startDate and endDate to lastModifiedAfter/Before', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ startDate: '2020-01-01T00:00:00Z', endDate: '2020-02-01T00:00:00Z' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.lastModifiedAfter).to.deep.equal(new Date('2020-01-01T00:00:00Z'))
        expect(req.search.lastModifiedBefore).to.deep.equal(new Date('2020-02-01T00:00:00Z'))
        return true
      }))
    })

    it('returns 400 for an invalid startDate', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ startDate: 'not a date' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses observationStartDate and observationEndDate to timestampAfter/Before', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ observationStartDate: '2020-01-01T00:00:00Z', observationEndDate: '2020-02-01T00:00:00Z' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.timestampAfter).to.deep.equal(new Date('2020-01-01T00:00:00Z'))
        expect(req.search.timestampBefore).to.deep.equal(new Date('2020-02-01T00:00:00Z'))
        return true
      }))
    })

    it('parses a comma-separated bbox into geometryIntersects', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ bbox: '1,2,3,4' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.geometryIntersects).to.deep.equal([ 1, 2, 3, 4 ])
        return true
      }))
    })

    it('returns 400 for an invalid bbox', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ bbox: '1,2,3' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses states into stateIsAnyOf', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ states: 'active,archived' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.stateIsAnyOf).to.deep.equal([ 'active', 'archived' ])
        return true
      }))
    })

    it('returns 400 for states with no valid values', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ states: 'bogus' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses favoritedBy into isFavoriteOfUser', async function () {

      const userId = uniqid()
      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ favoritedBy: userId })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.isFavoriteOfUser).to.equal(userId)
        return true
      }))
    })

    it('parses important=true and important=false', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`).query({ important: 'true' })
      await client.get(`${basePath}/events/${mageEvent.id}/observations`).query({ important: 'false' })

      app.received(1).readObservations(Arg.is(req => req.search.isFlaggedImportant === true))
      app.received(1).readObservations(Arg.is(req => req.search.isFlaggedImportant === undefined))
    })

    it('returns 400 for an invalid important value', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ important: 'maybe' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses hasAttachments=true', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`).query({ hasAttachments: 'true' })

      app.received(1).readObservations(Arg.is(req => req.search.hasAttachments === true))
    })

    it('parses a CSV users param into userIsAnyOf', async function () {

      const userA = uniqid()
      const userB = uniqid()
      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ users: `${userA},${userB}` })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.userIsAnyOf).to.deep.equal([ userA, userB ])
        return true
      }))
    })

    it('parses a CSV teams param into teamIsAnyOf', async function () {

      const teamA = uniqid()
      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ teams: teamA })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.teamIsAnyOf).to.deep.equal([ teamA ])
        return true
      }))
    })

    it('parses a keyword param into a field filter', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ keyword: 'lighthouse' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.filter).to.deep.equal({ keyword: 'lighthouse' })
        return true
      }))
    })

    it('parses a condition filter from the request body', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.post(`${basePath}/events/${mageEvent.id}/observations/search`)
        .send({ condition: { formId: 1, field: 'field1', operator: '=', value: 'x' } })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.filter).to.deep.equal({
          condition: { formId: 1, field: 'field1', operator: '=', value: 'x' }
        })
        return true
      }))
    })

    it('parses sort into orderBy', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ sort: 'lastModified+desc' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.orderBy).to.deep.equal({ field: 'lastModified', order: -1 })
        return true
      }))
    })

    it('returns 400 for an invalid sort field', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ sort: 'bogus' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses paging parameters when page_size is given', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success({ totalCount: 0, pageSize: 5, pageIndex: 1, items: [] }))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ page_size: '5', page: '1', include_total_count: 'true' })

      app.received(1).readObservations(Arg.is(req => {
        expect(req.search.paging).to.deep.equal({ pageIndex: 1, pageSize: 5, includeTotalCount: true })
        return true
      }))
    })

    it('returns 400 for an invalid page_size', async function () {

      const res = await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ page_size: '0' })

      expect(res.status).to.equal(400)
      app.didNotReceive().readObservations(Arg.any())
    })

    it('parses populate=true into populateUserNames', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)
        .query({ populate: 'true' })

      app.received(1).readObservations(Arg.is(req => req.search.populateUserNames === true))
    })

    it('defaults populateUserNames to false', async function () {

      app.readObservations(Arg.any()).resolves(AppResponse.success([]))
      await client.get(`${basePath}/events/${mageEvent.id}/observations`)

      app.received(1).readObservations(Arg.is(req => req.search.populateUserNames === false))
    })
  })

  describe('POST /id', function () {

    it('allocates an observation id', async function () {

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

    it('returns 403 without permission', async function () {

      app.allocateObservationId(Arg.any()).resolves(AppResponse.error(permissionDenied('create', testUser)))
      const res = await client.post(`${basePath}/events/${mageEvent.id}/observations/id`)
        .set('accept', 'application/json')

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMediaType)
    })
  })

  describe('PUT /observations/{observationId}', function () {

    it('saves the observation for a mod request', async function () {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [23, 45] },
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
        noGeometry: false,
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

    it('picks only geometry and properties from the request body', async function () {

      const obsId = uniqid()
      const reqBody = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [23, 45] },
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
        noGeometry: false,
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

    it('retains only valid properties', async function () {

      const validProperties: Required<ObservationFeatureProperties> = {
        timestamp: new Date(Date.now() - 500),
        provider: 'gps',
        accuracy: 350,
        delta: 7654,
        forms: [
          { id: 'entry1', formId: 1, field1: 123, field2: 'rocks' }
        ]
      }
      const augmentedValidProperties = {
        ...validProperties,
        wutIsThis: 'why is it here?',
        unacceptable: { why: 'trash' },
        tryAgain: new Date()
      }
    })

    it('uses event id only from the path', async function () {

      const obsId = uniqid()
      const reqBody = {
        eventId: mageEvent.id + 100,
        geometry: { type: 'Point', coordinates: [23, 45] },
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

    it('uses observation id only from the path', async function () {

      const obsIdInPath = uniqid()
      const reqBody = {
        id: uniqid(),
        geometry: { type: 'Point', coordinates: [23, 45] },
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

    it('returns 403 without permission', async function () {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [23, 45] },
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

    it('returns 404 when the observation id does not exist', async function () {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [23, 45] },
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

    it('returns 400 when the observation is invalid', async function () {

      const obsId = uniqid()
      const reqBody = {
        geometry: { type: 'Point', coordinates: [23, 45] } as Point,
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

  describe('PUT /observations/{observationId}/attachments/{attachmentId}', function () {

    let observationId: string
    let attachmentId: string
    let attachmentRequestPath: string
    let attachmentBytes: Buffer

    beforeEach(function () {
      observationId = uniqid()
      attachmentId = uniqid()
      attachmentRequestPath = `${basePath}/events/${mageEvent.id}/observations/${observationId}/attachments/${attachmentId}`
      attachmentBytes = Buffer.from(Array.from({ length: 10000 }).map(x => uniqid()).join(' | '))
    })

    it('accepts a file upload to store as attachment content', async function () {

      const fileName = uniqid('attachment-', '.mp4')
      const obs: ExoObservation = {
        id: uniqid(),
        createdAt: new Date(),
        lastModified: new Date(),
        eventId: mageEvent.id,
        favoriteUserIds: [],
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [65, 56] },
        noGeometry: false,
        properties: {
          timestamp: new Date(),
          forms: []
        },
        attachments: [
          { id: 'some-other-attachment-1', contentStored: true, observationFormId: 'entry1', fieldName: 'field1', oriented: false },
          {
            id: attachmentId,
            observationFormId: 'entry1',
            fieldName: 'field1',
            contentStored: true,
            oriented: false,
            size: attachmentBytes.length,
            contentType: 'video/mp4',
          }
        ]
      }
      const uploaded = new BufferWriteable()
      app.storeAttachmentContent(Arg.all()).mimicks(async appReq => {
        const uploadStream = appReq.content.bytes as NodeJS.ReadableStream
        uploadStream.pipe(uploaded)
        return AppResponse.success(obs)
      })
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: fileName, contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal(jsonForAttachment(obs.attachments[1], `${baseUrl}/events/${mageEvent.id}/observations/${observationId}`))
      expect(uploaded.bytes.toString()).to.equal(attachmentBytes.toString())
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal(fileName)
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        return true
      }))
    })

    it('accepts the upload if the first part is the attachment in an invalid request', async function () {

      const fileName = uniqid('attachment-', '.mp4')
      const obs: ExoObservation = {
        id: uniqid(),
        createdAt: new Date(),
        lastModified: new Date(),
        eventId: mageEvent.id,
        favoriteUserIds: [],
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [65, 56] },
        properties: {
          timestamp: new Date(),
          forms: []
        },
        attachments: [
          { id: 'some-other-attachment-1', contentStored: true, observationFormId: 'entry1', fieldName: 'field1', oriented: false },
          {
            id: attachmentId,
            observationFormId: 'entry1',
            fieldName: 'field1',
            contentStored: true,
            oriented: false,
            size: attachmentBytes.length,
            contentType: 'video/mp4',
          }
        ]
      }
      const uploaded = new BufferWriteable()
      app.storeAttachmentContent(Arg.all()).mimicks(async appReq => {
        const uploadStream = appReq.content.bytes as NodeJS.ReadableStream
        uploadStream.pipe(uploaded)
        return AppResponse.success(obs)
      })
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: fileName, contentType: 'video/mp4' })
        .field('nonsense', 'ignore this')
        .attach('invalid-file', attachmentBytes.subarray(0, attachmentBytes.length / 2))
        .field('more-nonsense', 'wut is going on')
        .accept('application/json')

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal(jsonForAttachment(obs.attachments[1], `${baseUrl}/events/${mageEvent.id}/observations/${observationId}`))
      expect(uploaded.bytes.toString()).to.equal(attachmentBytes.toString())
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal(fileName)
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        return true
      }))
    })

    it('returns 403 without permission', async function () {

      app.storeAttachmentContent(Arg.all()).resolves(AppResponse.error(permissionDenied('store attachment', 'you', observationId)))
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: 'does it matter.mp4', contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `permission denied: store attachment` })
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal('does it matter.mp4')
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        const reqStream = actualReq.content.bytes as Readable
        expect(reqStream.destroyed).to.be.true
        expect(reqStream.readable).to.be.false
        return true
      }))
    })

    it('returns 404 when the observation is not found', async function () {

      app.storeAttachmentContent(Arg.all()).resolves(AppResponse.error(entityNotFound(observationId, 'Observation')))
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: 'does it matter.mp4', contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `Observation not found: ${observationId}` })
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal('does it matter.mp4')
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        const reqStream = actualReq.content.bytes as Readable
        expect(reqStream.destroyed).to.be.true
        expect(reqStream.readable).to.be.false
        return true
      }))
    })

    it('returns 404 when the attachment is not found', async function () {

      const notFound = entityNotFound(attachmentId, `Attachment on observation ${observationId}`)
      app.storeAttachmentContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: 'does it matter.mp4', contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: notFound.message })
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal('does it matter.mp4')
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        const reqStream = actualReq.content.bytes as Readable
        expect(reqStream.destroyed).to.be.true
        expect(reqStream.readable).to.be.false
        return true
      }))
    })

    it('returns 400 when the attachment multipart field is not a file', async function () {

      const res = await client.put(attachmentRequestPath)
        .field('attachment', 'not a file.png')
        .accept('application/json')

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `request must contain only one file part named 'attachment'` })
      app.didNotReceive().storeAttachmentContent(Arg.all())
    })

    it('returns 400 when there is more than one multipart field preceding the attachment', async function () {

      const res = await client.put(attachmentRequestPath)
        .field('why', 'is this here')
        .attach('cmon', attachmentBytes.slice(0, attachmentBytes.length / 2), { filename: 'no.wut', contentType: 'text/plain' })
        .attach('attachment', attachmentBytes, { filename: 'too late.mp4', contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `request must contain only one file part named 'attachment'` })
      app.didNotReceive().storeAttachmentContent(Arg.all())
    })

    it('returns 400 if the request is not multipart/form-data', async function () {

      const res = await client.put(attachmentRequestPath)
        .accept('application/json')
        .send({ attachment: 'attempted json attachment' })

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: `Unsupported content type: application/json` })
      app.didNotReceive().storeAttachmentContent(Arg.all())
    })

    it('returns 400 when the content type does not match the attachment', async function () {

      const invalid = invalidInput('content type must match attachment media type')
      app.storeAttachmentContent(Arg.all()).resolves(AppResponse.error(invalid))
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: 'gonna fail.mp4', contentType: 'video/wut' })
        .accept('application/json')

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: invalid.message })
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal('gonna fail.mp4')
        expect(actualReq.content.mediaType).to.equal('video/wut')
        const reqStream = actualReq.content.bytes as Readable
        expect(reqStream.destroyed).to.be.true
        expect(reqStream.readable).to.be.false
        return true
      }))
    })

    it('returns 400 when the file name does not match the attachment', async function () {

      const invalid = invalidInput('content name must match attachment name')
      app.storeAttachmentContent(Arg.all()).resolves(AppResponse.error(invalid))
      const res = await client.put(attachmentRequestPath)
        .attach('attachment', attachmentBytes, { filename: 'gonna fail.mp4', contentType: 'video/mp4' })
        .accept('application/json')

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: invalid.message })
      app.received(1).storeAttachmentContent(Arg.all())
      app.received(1).storeAttachmentContent(Arg.is(actualReq => {
        expect(actualReq.observationId).to.equal(observationId)
        expect(actualReq.attachmentId).to.equal(attachmentId)
        expect(actualReq.content.name).to.equal('gonna fail.mp4')
        expect(actualReq.content.mediaType).to.equal('video/mp4')
        const reqStream = actualReq.content.bytes as Readable
        expect(reqStream.destroyed).to.be.true
        expect(reqStream.readable).to.be.false
        return true
      }))
    })

    it('TODO: supports localization - uploading localized attachment content, e.g. video or audio recordings?')
  })

  describe('HEAD /observations/{observationId}/attachments/{attachmentId}', function () {
    it('TODO: query for the attachment and return the headers based on the attachment meta-data')
    // TODO: include 'accept-ranges: bytes' header https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests
  })

  describe('GET /observations/{observationId}/attachments/{attachmentId}', function () {

    let observationId: string
    let attachmentId: string
    let attachmentRequestPath: string
    let attachmentBytes: Buffer

    beforeEach(function () {
      observationId = uniqid()
      attachmentId = uniqid()
      attachmentRequestPath = `${basePath}/events/${mageEvent.id}/observations/${observationId}/attachments/${attachmentId}`
      attachmentBytes = Buffer.from(Array.from({ length: 10000 }).map(x => uniqid()).join(' | '))
    })

    it('requests the content for the attachment in the request path', async function () {

      const content: ExoAttachmentContent = {
        attachment: {
          id: attachmentId,
          observationFormId: uniqid(),
          fieldName: 'field1',
          contentStored: true,
          oriented: true,
          contentType: 'image/jpeg',
          name: 'funny meme.jpg',
          size: attachmentBytes.length
        },
        bytes: Readable.from(attachmentBytes)
      }
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.success(content))
      const res = await client.get(attachmentRequestPath)

      expect(res.status).to.equal(200)
      expect(res.type).to.equal(content.attachment.contentType)
      expect(res.headers).to.have.property('content-length', String(attachmentBytes.length))
      expect(res.body).to.deep.equal(attachmentBytes)
      app.received(1).readAttachmentContent(Arg.all())
      app.received(1).readAttachmentContent(Arg.is(x => {
        expect(x).to.deep.include({
          attachmentId,
          observationId,
        })
        expect(x.minDimension).to.be.undefined
        expect(x.contentRange).to.be.undefined
        return true
      }))
    })

    it('gets the specified minimum thumbnail dimension', async function () {

      const content: ExoAttachmentContent = {
        attachment: {
          id: attachmentId,
          observationFormId: uniqid(),
          fieldName: 'field1',
          contentStored: true,
          oriented: true,
          contentType: 'image/jpeg',
          name: 'funny meme.jpg',
          size: attachmentBytes.length
        },
        bytes: Readable.from(attachmentBytes)
      }
      const minDimension = 320
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.success(content))
      const res = await client.get(`${attachmentRequestPath}?size=${minDimension}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.equal(content.attachment.contentType)
      expect(res.headers).to.have.property('content-length', String(attachmentBytes.length))
      expect(res.body).to.deep.equal(attachmentBytes)
      app.received(1).readAttachmentContent(Arg.all())
      app.received(1).readAttachmentContent(Arg.is(x => {
        expect(x).to.deep.include({
          attachmentId,
          observationId,
          minDimension,
        })
        expect(x.contentRange).to.be.undefined
        return true
      }))
    })

    it('passes the requested content range to the app layer', async function () {

      const content: ExoAttachmentContent = {
        attachment: {
          id: attachmentId,
          observationFormId: uniqid(),
          fieldName: 'field1',
          contentStored: true,
          oriented: true,
          contentType: 'image/jpeg',
          name: 'funny meme.jpg',
          size: attachmentBytes.length
        },
        bytes: Readable.from(attachmentBytes.slice(100, 200)),
        bytesRange: { start: 100, end: 199 }
      }
      const contentRange = { start: 100, end: 199 }
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.success(content))
      const res = await client.get(attachmentRequestPath)
        .set('range', 'bytes=100-199')

      expect(res.status).to.equal(206)
      expect(res.type).to.equal(content.attachment.contentType)
      expect(res.headers).to.have.property('content-length', String(100))
      expect(res.headers).to.have.property('content-range', `bytes 100-199/${content.attachment.size}`)
      expect(res.body).to.deep.equal(attachmentBytes.slice(100, 200))
      app.received(1).readAttachmentContent(Arg.all())
      app.received(1).readAttachmentContent(Arg.is(x => {
        expect(x).to.deep.include({
          attachmentId,
          observationId,
          contentRange,
        })
        return true
      }))
    })

    it('returns 403 without permission', async function () {

      const denied = permissionDenied('read attachment content', 'bernie')
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.error(denied))
      const res = await client.get(attachmentRequestPath)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: 'permission denied: read attachment content' })
      app.received(1).readAttachmentContent(Arg.all())
    })

    it('returns 404 if the attachment does not exist', async function () {

      const notFound = entityNotFound(attachmentId, 'Attachment')
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.get(attachmentRequestPath)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: notFound.message })
      app.received(1).readAttachmentContent(Arg.all())
    })

    it('returns 404 if the attachment content does not exist', async function () {

      const notFound = entityNotFound(attachmentId, 'Attachment content')
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.get(attachmentRequestPath)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: notFound.message })
      app.received(1).readAttachmentContent(Arg.all())
    })

    it('returns 404 if the observation does not exist', async function () {

      const notFound = entityNotFound(observationId, 'Observation')
      app.readAttachmentContent(Arg.all()).resolves(AppResponse.error(notFound))
      const res = await client.get(attachmentRequestPath)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMediaType)
      expect(res.body).to.deep.equal({ message: notFound.message })
      app.received(1).readAttachmentContent(Arg.all())
    })

    it('TODO: supports localization?')
  })
})

function saveObservationRequestWithObservation(expected: ExoObservationMod): (actual: SaveObservationRequest) => boolean {
  return actual => {
    const actualMod = actual.observation
    expect(actualMod).to.deep.equal(expected)
    return true
  }
}