import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import _ from 'lodash'
import { AppResponse, AppRequest } from '../../../lib/app.api/app.api.global'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { SettingsAppLayer, SettingsRoutes } from '../../../lib/adapters/settings/adapters.settings.controllers.web'
import { MobileSearchType, WebSearchType } from '../../../lib/entities/settings/entities.settings'
import { UpdateMapSettingsRequest } from '../../../src/app.api/settings/app.api.settings'

const rootPath = '/test/settings'
const jsonMimeType = /^application\/json/
const testUser = 'lummytin'

describe('settings web controller', function () {

  let createAppRequest: WebAppRequestFactory = <P>(_webReq: express.Request, params?: P): AppRequest<typeof testUser> & P => {
    return {
      context: {
        requestToken: Symbol(),
        requestingPrincipal(): typeof testUser {
          return testUser
        }
      },
      ...(params || {})
    } as AppRequest<typeof testUser> & P
  }
  let settingsRoutes: express.Router
  let app: express.Application
  let settingsApp: SubstituteOf<SettingsAppLayer>
  let client: supertest.SuperTest<supertest.Test>

  beforeEach(function () {
    settingsApp = Sub.for<SettingsAppLayer>()
    settingsRoutes = SettingsRoutes(settingsApp, createAppRequest)
    app = express()
    app.use(rootPath, settingsRoutes)
    client = supertest(app)
  })


  describe('POST /settings/map', function () {

    it('creates new map settings', async function () {
      const mapSettings = {
        webSearchType: WebSearchType.NOMINATIM,
        webNominatimUrl: "https://test.com",
        mobileSearchType: MobileSearchType.NATIVE,
        mobileNominatimUrl: "https://test.com"
      }

      const settings = { settings: mapSettings }

      settingsApp.updateMapSettings(Arg.is(x => _.isMatch(x, settings)))
        .resolves(AppResponse.success(mapSettings))

      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NOMINATIM,
          webNominatimUrl: "https://test.com",
          mobileSearchType: MobileSearchType.NATIVE,
          mobileNominatimUrl: "https://test.com"
        })

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(mapSettings)
    })

    it('fails to create new map settings with missing webNominatimUrl', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NOMINATIM,
          mobileSearchType: MobileSearchType.NOMINATIM,
          mobileNominatimUrl: "https://test.com"
        })

      expect(res.status).to.equal(400)
    })

    it('fails to create new map settings with missing mobileNominatimUrl', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NOMINATIM,
          webNominatimUrl: "https://test.com",
          mobileSearchType: MobileSearchType.NOMINATIM,
        })

      expect(res.status).to.equal(400)
    })

    it('fails to create new map settings with invalid webNominatimUrl', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NOMINATIM,
          webNominatimUrl: "invalid",
          mobileSearchType: MobileSearchType.NOMINATIM,
          mobileNominatimUrl: "https://test.com"
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Web Nominatim URL is required and must be a valid URL.')
    })

    it('fails to create new map settings with invalid mobileNominatimUrl', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NOMINATIM,
          webNominatimUrl: "https://test.com",
          mobileSearchType: MobileSearchType.NOMINATIM,
          mobileNominatimUrl: "invalid"
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Mobile Nominatim URL is required and must be a vaild URL.')
    })

    it('fails to create new map settings on missing webSearchType parameter', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          mobileSearchType: MobileSearchType.NONE
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Web search option is required.')
    })

    it('fails to create new map settings on missing mobileSearchType parameter', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NONE
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Mobile search option is required.')
    })

    it('fails to create new map settings on invalid webSearchType parameter', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: "invalid",
          mobileSearchType: MobileSearchType.NONE
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Web search option is required.')
    })

    it('fails to create new map settings on invalid mobileSearchType parameter', async function () {
      const res = await client
        .post(`${rootPath}/map`)
        .type('json')
        .send({
          webSearchType: WebSearchType.NONE,
          mobileSearchType: "invalid"
        })

      expect(res.status).to.equal(400)
      expect(res.body.message).to.deep.equal('Mobile search option is required.')
    })
  })
})