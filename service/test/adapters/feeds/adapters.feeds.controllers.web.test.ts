
import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import Substitute, { SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import _, { uniqueId } from 'lodash'
import { AppResponse, AppRequest } from '../../../lib/app.api/app.api.global'
import { FeedsRoutes, FeedsAppLayer } from '../../../lib/adapters/feeds/adapters.feeds.controllers.web'
import { CreateFeedServiceRequest, FeedServiceTypeDescriptor, PreviewTopicsRequest, CreateFeedRequest, ListServiceTopicsRequest, PreviewFeedRequest, FeedPreview, FeedExpanded, DeleteFeedRequest, ListServiceFeedsRequest, ListFeedServices, GetFeedServiceRequest, FeedServiceExpanded, DeleteFeedServiceRequest } from '../../../lib/app.api/feeds/app.api.feeds'
import { FeedService, Feed, FeedTopic, FeedCreateMinimal, FeedUpdateMinimal, ResolvedMapStyle, FeedServiceId, FeedTopicId } from '../../../lib/entities/feeds/entities.feeds'
import { permissionDenied, PermissionDeniedError, InvalidInputError, invalidInput, EntityNotFoundError, entityNotFound } from '../../../lib/app.api/app.api.errors'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { JSONSchema4 } from 'json-schema'
import { JsonObject } from '../../../lib/entities/entities.json_types'

declare module 'express-serve-static-core' {
  interface Request {
    testUser: string
  }
}

const jsonMimeType = /^application\/json/

describe('feeds web controller', function () {

  const adminPrincipal = {
    user: 'admin'
  }

  const createAdminRequest = <Params>(p?: Params): Params & AppRequest<{ user: string }> => {
    const safeParams = p || {} as any
    return {
      ...safeParams,
      context: {
        requestToken: Symbol(),
        requestingPrincipal() {
          return adminPrincipal
        }
      }
    }
  }

  type AppRequestFactoryHandle = {
    createRequest: WebAppRequestFactory
  }

  type FeedMinimalVerbose =
    { [K in keyof Required<Omit<FeedCreateMinimal, 'service' | 'topic'>>]: FeedCreateMinimal[K] | undefined } &
    { service: FeedServiceId, topic: FeedTopicId }

  const rootPath = '/test/feeds'
  let client: supertest.SuperTest<supertest.Test>
  let appLayer: SubstituteOf<FeedsAppLayer>
  let appRequestFactory: SubstituteOf<AppRequestFactoryHandle>

  beforeEach(function () {
    appLayer = Substitute.for<FeedsAppLayer>()
    appRequestFactory = Substitute.for<AppRequestFactoryHandle>()
    const feedsRoutes: express.Router = FeedsRoutes(appLayer, appRequestFactory.createRequest)
    const endpoint = express()
    endpoint.use(function lookupUser(req: express.Request, res: express.Response, next: express.NextFunction) {
      req.testUser = req.headers['user'] as string
      next()
    })
    endpoint.use(rootPath, feedsRoutes)
    client = supertest(endpoint)
  })

  describe('GET /service_types', function () {

    it('lists service types', async function () {

      const serviceTypes: FeedServiceTypeDescriptor[] = [
        {
          descriptorOf: 'FeedServiceType',
          id: 'wfs',
          pluginServiceTypeId: 'urn:ogc:wfs',
          title: 'Web Feature Service',
          summary: null,
          configSchema: {
            title: 'URL',
            description: 'The base URL of the WFS endpoint',
            type: 'string',
            format: 'uri'
          }
        },
        {
          descriptorOf: 'FeedServiceType',
          id: 'nws',
          pluginServiceTypeId: 'https://www.weather.gov',
          title: 'National Weather Service',
          summary: null,
          configSchema: null
        }
      ]
      const appReq = createAdminRequest()
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals(void 0)).returns(appReq)
      appLayer.listServiceTypes(Arg.deepEquals(appReq)).resolves(AppResponse.success(serviceTypes))
      const res = await client.get(`${rootPath}/service_types`)
        .set('user', adminPrincipal.user)

      expect(res.type).to.match(jsonMimeType)
      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal(serviceTypes)
    })

    it('fails without permission', async function () {

      appLayer.listServiceTypes(Arg.any()).resolves(AppResponse.error(permissionDenied('list service types', 'admin')))

      const res = await client.get(`${rootPath}/service_types`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'permission denied: list service types' })
    })
  })

  describe('POST /service_types/:serviceTypeId/topic_preview', function () {

    it('returns the list of topics for the service config', async function () {

      const topics: FeedTopic[] = [
        {
          id: 'asam',
          title: 'Anti-Shipping Activity Messages',
          itemsHaveSpatialDimension: true,
          itemTemporalProperty: 'date',
          itemPrimaryProperty: 'description'
        },
        {
          id: 'navwarn',
          title: 'Navigational Warnings',
          itemsHaveSpatialDimension: false,
          itemTemporalProperty: 'issueDate'
        }
      ]
      const postBody = {
        serviceConfig: 'https://msi.gs.mil'
      }
      const reqParams = {
        ...postBody,
        serviceType: 'nga-msi'
      }
      const appReq: PreviewTopicsRequest = createAdminRequest(reqParams)
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals(reqParams)).returns(appReq)
      appLayer.previewTopics(Arg.deepEquals(appReq))
        .resolves(AppResponse.success<FeedTopic[], unknown>(topics))

      const res = await client.post(`${rootPath}/service_types/nga-msi/topic_preview`).send(postBody)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(topics)
    })

    it('fails with 403 without permission', async function () {

      appLayer.previewTopics(Arg.any())
        .resolves(AppResponse.error(permissionDenied('preview topics', 'you')))

      const res = await client.post(`${rootPath}/service_types/nga-msi/topic_preview`).send({
        serviceConfig: 'https://msi.gs.mil'
      })

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'permission denied: preview topics' })
    })

    it('fails with 404 if the service type does not exist', async function () {

      appLayer.previewTopics(Arg.any())
        .resolves(AppResponse.error(entityNotFound('nga-msi', 'feed service type')))

      const res = await client.post(`${rootPath}/service_types/nga-msi/topic_preview`).send({
        serviceConfig: 'does not exist'
      })

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'feed service type not found: nga-msi' })
    })

    it('fails with 400 if the service config is invalid', async function () {

      appLayer.previewTopics(Arg.any())
        .resolves(AppResponse.error(invalidInput('bad service config', ['unexpected null', 'serviceConfig'])))

      const res = await client.post(`${rootPath}/service_types/nga-msi/topic_preview`).send({
        serviceConfig: null
      })

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'bad service config\n  serviceConfig: unexpected null' })
    })
  })

  describe('POST /services', function () {

    it('creates a service', async function () {

      const submitted = {
        serviceType: 'wfs',
        title: 'USGS Earthquake Data',
        summary: 'Pull features from the USGS earthquake WFS endpoint',
        config: {
          url: 'https://usgs.gov/data/earthquakes/wfs?service=WFS'
        }
      }
      const appReq: CreateFeedServiceRequest = createAdminRequest(submitted)
      const created: FeedService = {
        id: `wfs:${uniqid()}`,
        ...submitted
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals(submitted)).returns(appReq)
      appLayer.createService(Arg.deepEquals(appReq)).resolves(AppResponse.success(created))

      const res = await client.post(`${rootPath}/services`)
        .set('user', adminPrincipal.user)
        .send(submitted)

      expect(res.status).to.equal(201)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(created)
    })

    it('fails with 403 without permission', async function () {

      appLayer.createService(Arg.any()).resolves(AppResponse.error(permissionDenied('create service', 'admin')))

      const res = await client.post(`${rootPath}/services`)
        .send({
          serviceType: 'nga-msi',
          title: 'NGA Maritime Safety Information',
          config: null
        })

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'permission denied: create service' })
    })

    it('fails with 400 if the request is invalid', async function () {

      const reqBody = {
        serviceType: 'wfs',
        title: 'Invalid Service',
        config: {
          url: 'https://invalid.service.url'
        },
      }
      appLayer.createService(Arg.any()).resolves(AppResponse.error(invalidInput('invalid service config', ['url is invalid', 'config', 'url'])))

      const res = await client.post(`${rootPath}/services`).send(reqBody)

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `
invalid service config
  config > url: url is invalid`
        .trim() })
      appLayer.received(1).createService(Arg.any())
    })

    it('fails with 400 if the service type does not exist', async function () {

      const reqBody = {
        serviceType: 'not_found',
        title: 'What Service Type?',
        config: {}
      }
      appLayer.createService(Arg.any()).resolves(AppResponse.error(entityNotFound(reqBody.serviceType, 'FeedServiceType')))

      const res = await client.post(`${rootPath}/services`).send(reqBody)

      expect(res.status).to.equal(400)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'service type not found' })
      appLayer.received(1).createService(Arg.any())
    })

    describe('request body mapping', function () {

      it('fails with 400 if the request body has no service type', async function () {

        appLayer.createService(Arg.any()).rejects(new Error('unexpected'))
        const res = await client.post(`${rootPath}/services`)
          .send({
            title: 'Forgot Service Type',
            config: {
              url: 'https://unknown.service.type'
            }
          })

        expect(res.status).to.equal(400)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ message: `
invalid request
  serviceType: missing
          `.trim() })
        appLayer.didNotReceive().createService(Arg.any())
      })

      it('fails if the request body has no title', async function () {

        appLayer.createService(Arg.any()).rejects(new Error('unexpected'))
        const res = await client.post(`${rootPath}/services`)
          .send({
            serviceType: 'wfs',
            config: {
              url: 'https://usgs.gov/earthquakes'
            }
          })

        expect(res.status).to.equal(400)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal({ message: `
invalid request
  title: missing`
          .trim() })
        appLayer.didNotReceive().createService(Arg.any())
      })

      it('maps absent config to null', async function () {

        const params = {
          serviceType: 'configless',
          title: 'No Config Necessary',
          config: null,
          summary: undefined,
        }
        const appReq: CreateFeedServiceRequest = createAdminRequest(params)
        const created = {
          id: uniqid(),
          serviceType: 'configless',
          title: 'No Config Necessary',
          summary: null,
          config: null,
        }
        appRequestFactory.createRequest(Arg.any(), Arg.deepEquals(params)).returns(appReq)
        appLayer.createService(Arg.deepEquals(appReq))
          .resolves(AppResponse.success<FeedService, unknown>(created))

        const res = await client.post(`${rootPath}/services`)
          .set('user', 'admin')
          .send(_.omit(appReq, 'config'))

        expect(res.status).to.equal(201)
        expect(res.type).to.match(jsonMimeType)
        expect(res.body).to.deep.equal(created)
        appLayer.received(1).createService(Arg.deepEquals(appReq))
      })
    })
  })

  describe('GET /services', function () {

    it('returns all the services', async function () {

      const appReq = createAdminRequest()
      appRequestFactory.createRequest(Arg.any()).returns(appReq)
      const services: FeedService[] = [
        {
          id: 'wfs:' + uniqid(),
          serviceType: 'wfs',
          title: 'Agricultural Features',
          config: 'https://usda.gov/wfs/ag',
          summary: null
        },
        {
          id: 'denver_weather:' + uniqid(),
          serviceType: 'denver_weather',
          title: 'Denver Area Weather Updates',
          config: null,
          summary: 'A propprietary service that provides updates about Denver area local weather events'
        }
      ]
      appLayer.listServices(Arg.is((x: AppRequest) => x.context.requestToken === appReq.context.requestToken))
        .resolves(AppResponse.success<FeedService[], unknown>(services))
      const res = await client.get(`${rootPath}/services`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(services)
    })

    it('returns 403 without permission', async function () {

      appLayer.listServices(Arg.any())
        .resolves(AppResponse.error(permissionDenied('list services', 'you')))
      const res = await client.get(`${rootPath}/services`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'permission denied: list services' })
    })
  })

  describe('GET /services/{serviceId}', function () {

    it('fetches the service for the service id in the path', async function () {

      const service: FeedServiceExpanded = {
        id: uniqid(),
        serviceType: {
          descriptorOf: 'FeedServiceType',
          id: uniqueId(),
          pluginServiceTypeId: 'urn:test',
          title: 'Test Service Type',
          summary: null,
          configSchema: {},
        },
        title: 'Get Service Test',
        summary: null,
        config: { test: true }
      }
      const appReq: GetFeedServiceRequest = createAdminRequest({ service: service.id })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service: service.id })).returns(appReq)
      appLayer.getService(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success(service))
      const res = await client.get(`${rootPath}/services/${service.id}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(service)
      appLayer.received(1).getService(Arg.any())
    })

    it('fails with 404 if the service is not found', async function () {

      const service = uniqid()
      const appReq: GetFeedServiceRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.getService(Arg.any()).resolves(AppResponse.error(entityNotFound(service, 'feed service')))
      const res = await client.get(`${rootPath}/services/${service}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `feed service not found: ${service}` })
      appLayer.received(1).getService(Arg.any())
    })

    it('fails with 403 without permission', async function () {

      const service = uniqid()
      const appReq: GetFeedServiceRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.getService(Arg.any()).resolves(AppResponse.error(permissionDenied('get service', adminPrincipal.user, service)))
      const res = await client.get(`${rootPath}/services/${service}`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `permission denied: get service` })
      appLayer.received(1).getService(Arg.any())
    })
  })

  describe('DELETE /services/{serviceId}', function () {

    it('deletes the service for the service id in the path', async function () {

      const service = uniqid()
      const appReq = createAdminRequest({ service })
      appLayer.deleteService(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success(true))
      const res = await client.delete(`${rootPath}/services/abc123`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(/text/)
      expect(res.text).to.equal('')
    })

    it('fails with 404 if the service is not found', async function () {

      const service = uniqid()
      const appReq: DeleteFeedServiceRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.deleteService(Arg.any()).resolves(AppResponse.error(entityNotFound(service, 'feed service')))
      const res = await client.delete(`${rootPath}/services/${service}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `feed service not found: ${service}` })
      appLayer.received(1).deleteService(Arg.any())
    })

    it('fails with 403 without permission', async function () {

      const service = uniqid()
      const appReq: DeleteFeedServiceRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.deleteService(Arg.any()).resolves(AppResponse.error(permissionDenied('delete service', adminPrincipal.user, service)))
      const res = await client.delete(`${rootPath}/services/${service}`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `permission denied: delete service` })
      appLayer.received(1).deleteService(Arg.any())
    })
  })

  describe('GET /services/{serviceId}/topics', function () {

    it('lists the service topcis', async function () {

      const service = uniqid()
      const topics: FeedTopic[] = [
        {
          id: uniqid(),
          title: 'Fossil Discoveries',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'summary',
        },
        {
          id: uniqid(),
          title: 'Potential Fossil Sites',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'locationName',
          itemSecondaryProperty: 'summary',
          paramsSchema: {
            type: 'object',
            properties: {
              bbox: { type: 'array' },
            }
          }
        }
      ]
      const appReq: ListServiceTopicsRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.listTopics(Arg.requestTokenMatches(appReq))
        .resolves(AppResponse.success(topics))

      const res = await client.get(`${rootPath}/services/${service}/topics`)
      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(topics)
    })

    it('fails with 404 if the service does not exist', async function () {

      const service = uniqid()
      const appReq: ListServiceTopicsRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.listTopics(Arg.requestTokenMatches(appReq))
        .resolves(AppResponse.error(entityNotFound(service, 'FeedService')))

      const res = await client.get(`${rootPath}/services/${service}/topics`)
      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `FeedService not found: ${service}` })
    })

    it('fails with 403 without permission', async function () {

      const service = uniqid()
      const appReq: ListServiceTopicsRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.listTopics(Arg.requestTokenMatches(appReq))
        .resolves(AppResponse.error(permissionDenied('list topics', adminPrincipal.user)))

      const res = await client.get(`${rootPath}/services/${service}/topics`)
      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: `permission denied: list topics` })
    })
  })

  describe('POST /services/{serviceId}/topics/{topicId}/feed_preview', function () {

    type CompletePreviewFeedRequestParams = Required<Omit<PreviewFeedRequest, 'context' | 'skipContentFetch'>> & {
      feed: Omit<Required<PreviewFeedRequest['feed']>, 'id'>
    }

    type CompleteFeedPreview = FeedPreview & {
      feed: Required<FeedPreview['feed']>
    }

    it('maps the web request to the app request', async function () {

      const service = uniqid()
      const topic = uniqid()
      const appReqParams: CompletePreviewFeedRequestParams = Object.freeze({
        feed: {
          service,
          topic,
          title: 'Title of Feed',
          summary: 'Testing the feed preview',
          icon: { id: uniqid() },
          itemsHaveIdentity: false,
          itemsHaveSpatialDimension: true,
          itemTemporalProperty: 'when',
          itemPrimaryProperty: 'summary',
          itemSecondaryProperty: 'details',
          updateFrequencySeconds: 120,
          constantParams: {
            limit: 50
          },
          variableParamsSchema: {
            type: 'object',
            properties: {
              bbox: { type: 'array', items: { type: 'number' } }
            }
          },
          mapStyle: {
            stroke: 'abcdef',
            strokeWidth: 2.5
          },
          itemPropertiesSchema: {
            type: 'object',
            title: 'Properties of Items'
          },
          localization: {
            'x-test': {
              title: 'All Title'
            }
          }
        },
        variableParams: {
          bbox: [12, 13, 14, 15]
        }
      })
      const appReq: PreviewFeedRequest = createAdminRequest(appReqParams)
      const preview: CompleteFeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: appReqParams.feed.title,
          summary: appReqParams.feed.summary as string,
          icon: { id: appReqParams.feed.icon!.id! },
          itemsHaveIdentity: appReqParams.feed.itemsHaveIdentity,
          itemsHaveSpatialDimension: appReqParams.feed.itemsHaveSpatialDimension,
          itemPrimaryProperty: appReqParams.feed.itemTemporalProperty as string,
          itemSecondaryProperty: appReqParams.feed.itemSecondaryProperty as string,
          itemTemporalProperty: appReqParams.feed.itemTemporalProperty as string,
          updateFrequencySeconds: appReqParams.feed.updateFrequencySeconds as number,
          constantParams: appReqParams.feed.constantParams as JsonObject,
          variableParamsSchema: appReqParams.feed.variableParamsSchema as JSONSchema4,
          mapStyle: appReqParams.feed.mapStyle as ResolvedMapStyle,
          itemPropertiesSchema: appReqParams.feed.itemPropertiesSchema as JSONSchema4,
          localization: appReqParams.feed.localization!
        },
        content: {
          topic,
          feed: 'preview',
          variableParams: appReqParams.variableParams,
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals(appReqParams)).returns(appReq)
      appLayer.previewFeed(Arg.is(x => x === appReq)).resolves(AppResponse.success<FeedPreview, unknown>(preview))

      expect(appReq).to.deep.include(appReqParams)

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview`).send(appReqParams)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(preview)
    })

    it('accepts empty body', async function () {

      const service = uniqid()
      const topic = uniqid()
      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'topicPrimary',
        },
        content: {
          topic,
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.success<FeedPreview, unknown>(preview))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview`).send({})

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(preview)
    })

    it('adds the skip content fetch flag when parameter is true', async function () {

      const service = uniqid()
      const topic = uniqid()
      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed,
        variableParams: undefined,
        skipContentFetch: true
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined, skipContentFetch: true })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.success<FeedPreview, unknown>(preview))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview?skip_content_fetch=true`).send(minimalFeed)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(preview)
      appLayer.received(1).previewFeed(Arg.deepEquals(appReq))
    })

    it('does not add skip content fetch flag when parameter is not true', async function () {

      const service = uniqid()
      const topic = uniqid()
      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed,
        variableParams: undefined
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        },
        content: {
          topic,
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.success<FeedPreview, unknown>(preview))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview?skip_content_fetch=truish`).send(minimalFeed)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(preview)
      appLayer.received(1).previewFeed(Arg.deepEquals(appReq))
    })

    it('fails with 404 if the service does not exist', async function () {
      const service = uniqid()
      const topic = uniqid()

      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'topicPrimary',
        },
        content: {
          topic,
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.error(entityNotFound(service, 'FeedService')))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview`).send({})

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      appLayer.received(1).previewFeed(Arg.any())
    })

    it('fails with 404 if the topic does not exist', async function () {
      const service = uniqid()
      const topic = uniqid()

      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'topicPrimary',
        },
        content: {
          topic,
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.error(entityNotFound(topic, 'FeedTopic')))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview`).send({})

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      appLayer.received(1).previewFeed(Arg.any())
    })

    it('fails with 403 without permission', async function () {
      const service = uniqid()
      const topic = uniqid()
      const minimalFeed: FeedMinimalVerbose = Object.freeze({
        service,
        topic,
        title: undefined,
        summary: undefined,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        constantParams: undefined,
        variableParamsSchema: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      })
      const appReq: PreviewFeedRequest = createAdminRequest({
        feed: minimalFeed
      })
      const preview: FeedPreview = {
        feed: {
          id: 'preview',
          service,
          topic,
          title: 'Topic Title',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPrimaryProperty: 'topicPrimary',
        },
        content: {
          topic,
          feed: 'preview',
          items: {
            type: 'FeatureCollection',
            features: []
          }
        }
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: minimalFeed, variableParams: undefined })).returns(appReq)
      appLayer.previewFeed(appReq).resolves(AppResponse.error(permissionDenied('FEEDS_CREATE_FEED', adminPrincipal.user)))

      const res = await client.post(`${rootPath}/services/${service}/topics/${topic}/feed_preview`).send({})

      expect(res.status).to.equal(403)
    })
  })

  describe('POST /services/{serviceId}/topics/{topicId}/feeds', function () {

    it('creates a feed for service and topic', async function () {

      const service = uniqid()
      const topic = uniqid()
      const postBody = {
        title: 'Created Feed',
        summary: 'The feed we created',
        constantParams: {
          test: true
        },
        variableParamsSchema: <JSONSchema4>{
          type: 'object',
          properties: {
            where: {
              type: 'array', items: { type: 'number' }
            },
            when: {
              type: 'number'
            }
          }
        }
      }
      const feedMinimal: FeedMinimalVerbose = {
        ...postBody,
        service,
        topic,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      }
      const appReq: CreateFeedRequest = createAdminRequest({ feed: feedMinimal })
      const feed: FeedExpanded = {
        id: uniqid(),
        service: {
          id: service,
          serviceType: 'servicetype1',
          title: 'Service 1',
          summary: 'Service 1 summary',
          config: { test: true }
        },
        topic: {
          id: topic,
          title: 'Topic 1'
        },
        title: appReq.feed.title!,
        summary: appReq.feed.summary!,
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false,
        constantParams: appReq.feed.constantParams || undefined,
        variableParamsSchema: appReq.feed.variableParamsSchema || undefined
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: appReq.feed })).returns(appReq)
      appLayer.createFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success<FeedExpanded, unknown>(feed))

      const res = await client
        .post(`${rootPath}/services/${service}/topics/${topic}/feeds`)
        .send(postBody)

      expect(res.status).to.equal(201)
      expect(res.header.location).to.equal(`${rootPath}/${feed.id}`)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(feed)
    })

    it('tests all the input parameters', async function () {
      const service = uniqid()
      const topic = uniqid()

      const postBody = {
        title: 'Created Feed',
        summary: 'The feed we created',
        icon: { id: uniqid() },
        constantParams: {
          test: true
        },
        variableParamsSchema: <JSONSchema4>{
          type: 'object',
          properties: {
            where: {
              type: 'array', items: { type: 'number' }
            },
            when: {
              type: 'number'
            }
          }
        },
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemTemporalProperty: 'date',
        itemPrimaryProperty: 'title',
        itemSecondaryProperty: 'summary',
        updateFrequencySeconds: 60,
        mapStyle: {
          stroke: 'abcdef',
          strokeWidth: 2.5
        },
        itemPropertiesSchema: <JSONSchema4>{
          type: 'object',
          title: 'Properties of Items'
        },
        localization: {
          'x-wat': { title: 'Title in Wat' }
        },
      }

      const feedMinimal: FeedMinimalVerbose = {
        ...postBody,
        service,
        topic
      }

      const appReq: CreateFeedRequest = createAdminRequest({ feed: feedMinimal })

      const feed: FeedExpanded = {
        id: uniqid(),
        service: {
          id: service,
          serviceType: 'servicetype1',
          title: 'Service 1',
          summary: 'Service 1 summary',
          config: { test: true }
        },
        topic: {
          id: topic,
          title: 'Topic 1'
        },
        ...postBody
      }

      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: appReq.feed })).returns(appReq)
      appLayer.createFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success<FeedExpanded, unknown>(feed))

      const res = await client
        .post(`${rootPath}/services/${service}/topics/${topic}/feeds`)
        .send(postBody)

      expect(res.status).to.equal(201)
      expect(res.header.location).to.equal(`${rootPath}/${feed.id}`)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(feed)
    })

    it('returns 403 for permission denied error', async function () {
      const service = uniqid()
      const topic = uniqid()
      const postBody = {
        title: 'Created Feed',
        summary: 'The feed we created',
        constantParams: {
          test: true
        },
        variableParamsSchema: <JSONSchema4>{
          type: 'object',
          properties: {
            where: {
              type: 'array', items: { type: 'number' }
            },
            when: {
              type: 'number'
            }
          }
        }
      }
      const feedMinimal: FeedMinimalVerbose = {
        ...postBody,
        service,
        topic,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      }
      const appReq: CreateFeedRequest = createAdminRequest({ feed: feedMinimal })
      const feed: FeedExpanded = {
        id: uniqid(),
        service: {
          id: service,
          serviceType: 'servicetype1',
          title: 'Service 1',
          summary: 'Service 1 summary',
          config: { test: true }
        },
        topic: {
          id: topic,
          title: 'Topic 1'
        },
        title: appReq.feed.title!,
        summary: appReq.feed.summary!,
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false,
        constantParams: appReq.feed.constantParams || undefined,
        variableParamsSchema: appReq.feed.variableParamsSchema || undefined
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: appReq.feed })).returns(appReq)
      appLayer.createFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(permissionDenied(service, 'feed service')))

      const res = await client
        .post(`${rootPath}/services/${service}/topics/${topic}/feeds`)
        .send(postBody)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
    })

    it('returns 404 when the service does not exist', async function () {
      const service = uniqid()
      const topic = uniqid()
      const postBody = {
        title: 'Created Feed',
        summary: 'The feed we created',
        constantParams: {
          test: true
        },
        variableParamsSchema: <JSONSchema4>{
          type: 'object',
          properties: {
            where: {
              type: 'array', items: { type: 'number' }
            },
            when: {
              type: 'number'
            }
          }
        }
      }
      const feedMinimal: FeedMinimalVerbose = {
        ...postBody,
        service,
        topic,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      }
      const appReq: CreateFeedRequest = createAdminRequest({ feed: feedMinimal })
      const feed: FeedExpanded = {
        id: uniqid(),
        service: {
          id: service,
          serviceType: 'servicetype1',
          title: 'Service 1',
          summary: 'Service 1 summary',
          config: { test: true }
        },
        topic: {
          id: topic,
          title: 'Topic 1'
        },
        title: appReq.feed.title!,
        summary: appReq.feed.summary!,
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false,
        constantParams: appReq.feed.constantParams || undefined,
        variableParamsSchema: appReq.feed.variableParamsSchema || undefined
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: appReq.feed })).returns(appReq)
      appLayer.createFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed.service, 'feed service')))

      const res = await client
        .post(`${rootPath}/services/${service}/topics/${topic}/feeds`)
        .send(postBody)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })

    it('returns 404 when the service type is not found', async function () {
      const service = uniqid()
      const topic = uniqid()
      const postBody = {
        title: 'Created Feed',
        summary: 'The feed we created',
        constantParams: {
          test: true
        },
        variableParamsSchema: <JSONSchema4>{
          type: 'object',
          properties: {
            where: {
              type: 'array', items: { type: 'number' }
            },
            when: {
              type: 'number'
            }
          }
        }
      }
      const feedMinimal: FeedMinimalVerbose = {
        ...postBody,
        service,
        topic,
        icon: undefined,
        itemsHaveIdentity: undefined,
        itemsHaveSpatialDimension: undefined,
        itemPrimaryProperty: undefined,
        itemSecondaryProperty: undefined,
        itemTemporalProperty: undefined,
        updateFrequencySeconds: undefined,
        mapStyle: undefined,
        itemPropertiesSchema: undefined,
        localization: undefined,
      }
      const appReq: CreateFeedRequest = createAdminRequest({ feed: feedMinimal })
      const feed: FeedExpanded = {
        id: uniqid(),
        service: {
          id: service,
          serviceType: 'servicetype1',
          title: 'Service 1',
          summary: 'Service 1 summary',
          config: { test: true }
        },
        topic: {
          id: topic,
          title: 'Topic 1'
        },
        title: appReq.feed.title!,
        summary: appReq.feed.summary!,
        itemsHaveIdentity: false,
        itemsHaveSpatialDimension: false,
        constantParams: appReq.feed.constantParams || undefined,
        variableParamsSchema: appReq.feed.variableParamsSchema || undefined
      }
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: appReq.feed })).returns(appReq)
      appLayer.createFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed.service.serviceType, 'feed service type')))

      const res = await client
        .post(`${rootPath}/services/${service}/topics/${topic}/feeds`)
        .send(postBody)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })
  })

  describe('GET /services/{serviceId}/feeds', function () {

    it('returns the list of feeds that reference the service', async function () {

      const service = uniqid()
      const feeds: Feed[] = [
        {
          id: uniqid(),
          service,
          topic: uniqid(),
          title: 'Turtles',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        },
        {
          id: uniqid(),
          service,
          topic: uniqid(),
          title: 'Snakes',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        }
      ]
      const appReq: ListServiceFeedsRequest = createAdminRequest({ service })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ service })).returns(appReq)
      appLayer.listServiceFeeds(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success(feeds))
      const res = await client.get(`${rootPath}/services/${service}/feeds`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(feeds)
    })

    it('returns 404 if the service is not found', async function () {

      appLayer.listServiceFeeds(Arg.any()).resolves(AppResponse.error(entityNotFound('404', 'feed service')))
      const res = await client.get(`${rootPath}/services/404/feeds`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'feed service not found: 404' })
    })

    it('returns 403 without permission', async function () {

      appLayer.listServiceFeeds(Arg.any()).resolves(AppResponse.error(permissionDenied('list feeds', adminPrincipal.user, 'abc123')))
      const res = await client.get(`${rootPath}/services/abc123/feeds`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal({ message: 'permission denied: list feeds' })
    })
  })

  describe('GET /', function () {

    it('returns all the feeds', async function () {

      const feeds: Feed[] = [
        {
          id: uniqid(),
          service: uniqid(),
          topic: 'tornadoes',
          title: 'Tornadoes',
          itemsHaveIdentity: false,
          itemsHaveSpatialDimension: true
        },
        {
          id: uniqid(),
          service: uniqid(),
          topic: 'bears',
          title: 'Grizzly Bears',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemTemporalProperty: 'when',
          constantParams: {
            type: 'grizzly'
          }
        }
      ]
      const appReq = createAdminRequest()
      appRequestFactory.createRequest(Arg.any()).returns(appReq)
      appLayer.listAllFeeds(appReq).resolves(AppResponse.success<Feed[], unknown>(feeds))

      const res = await client.get(`${rootPath}/`)
      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(feeds)
    })
  })

  describe('GET /{feedId}', function () {

    it('returns the feed for the id in the path', async function () {

      const feedId = uniqid()
      const feed: FeedExpanded = {
        id: feedId,
        service: {
          id: uniqid(),
          title: 'The Service That Provides the Topic',
          summary: null,
          config: { test: true },
          serviceType: uniqid(),
        },
        topic: {
          id: uniqid(),
          title: 'The Topic of the Feed',
        },
        title: 'Get the Feed',
        summary: 'Get it and test it',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        constantParams: {
          test: 'yes'
        },
        itemPrimaryProperty: 'title',
        itemTemporalProperty: 'date',
        variableParamsSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' }
          }
        }
      }
      const appReq = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.success<FeedExpanded, unknown>(feed))
      const res = await client.get(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(feed)
    })

    it('fails with 404 if the feed does not exist', async function () {
      const feedId = uniqid()
      const feed: FeedExpanded = {
        id: feedId,
        service: {
          id: uniqid(),
          title: 'The Service That Provides the Topic',
          summary: null,
          config: { test: true },
          serviceType: uniqid(),
        },
        topic: {
          id: uniqid(),
          title: 'The Topic of the Feed',
        },
        title: 'Get the Feed',
        summary: 'Get it and test it',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        constantParams: {
          test: 'yes'
        },
        itemPrimaryProperty: 'title',
        itemTemporalProperty: 'date',
        variableParamsSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' }
          }
        }
      }
      const appReq = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed, 'feed')))
      const res = await client.get(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })

    it('fails with 404 if the service does not exist', async function () {

      const feedId = uniqid()
      const feed: FeedExpanded = {
        id: feedId,
        service: {
          id: uniqid(),
          title: 'The Service That Provides the Topic',
          summary: null,
          config: { test: true },
          serviceType: uniqid(),
        },
        topic: {
          id: uniqid(),
          title: 'The Topic of the Feed',
        },
        title: 'Get the Feed',
        summary: 'Get it and test it',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        constantParams: {
          test: 'yes'
        },
        itemPrimaryProperty: 'title',
        itemTemporalProperty: 'date',
        variableParamsSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' }
          }
        }
      }
      const appReq = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed.service, 'service')))
      const res = await client.get(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })

    it('fails with 404 if the topic does not exist', async function () {

      const feedId = uniqid()
      const feed: FeedExpanded = {
        id: feedId,
        service: {
          id: uniqid(),
          title: 'The Service That Provides the Topic',
          summary: null,
          config: { test: true },
          serviceType: uniqid(),
        },
        topic: {
          id: uniqid(),
          title: 'The Topic of the Feed',
        },
        title: 'Get the Feed',
        summary: 'Get it and test it',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        constantParams: {
          test: 'yes'
        },
        itemPrimaryProperty: 'title',
        itemTemporalProperty: 'date',
        variableParamsSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' }
          }
        }
      }
      const appReq = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed.topic, 'topic')))
      const res = await client.get(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })

    it('fails with 404 if the service type does not exist', async function () {

      const feedId = uniqid()
      const feed: FeedExpanded = {
        id: feedId,
        service: {
          id: uniqid(),
          title: 'The Service That Provides the Topic',
          summary: null,
          config: { test: true },
          serviceType: uniqid(),
        },
        topic: {
          id: uniqid(),
          title: 'The Topic of the Feed',
        },
        title: 'Get the Feed',
        summary: 'Get it and test it',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        constantParams: {
          test: 'yes'
        },
        itemPrimaryProperty: 'title',
        itemTemporalProperty: 'date',
        variableParamsSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number' }
          }
        }
      }
      const appReq = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.all()).returns(appReq)
      appLayer.getFeed(Arg.requestTokenMatches(appReq)).resolves(AppResponse.error(entityNotFound(feed.service.serviceType, 'service type')))
      const res = await client.get(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })
  })

  describe('PUT /{feedId}', async function () {

    it('maps the request body to a feed update', async function () {

      const body: Required<FeedUpdateMinimal> & { superfluous: any, service: string, topic: string } = {
        id: uniqid(),
        title: 'Update Title',
        summary: 'Update summary',
        icon: { id: uniqid() },
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPrimaryProperty: 'updated1',
        itemSecondaryProperty: 'updated2',
        itemTemporalProperty: 'updatedTime',
        constantParams: { updated: 'yes' },
        variableParamsSchema: {
          properties: { updated: { type: 'object' } }
        },
        mapStyle: {
          icon: { id: uniqid() }
        },
        updateFrequencySeconds: 987,
        itemPropertiesSchema: {
          type: 'object',
          title: 'Updated Schema'
        },
        localization: {
          'x-test': { title: 'Alt Title' }
        },
        superfluous: {
          partOfUpdate: false
        },
        service: 'service not allowed',
        topic: 'topic not allowed'
      }
      const feedUpdate: Required<FeedUpdateMinimal> = _.omit(body, 'superfluous', 'service', 'topic')
      const appReq = createAdminRequest({ feed: feedUpdate })
      const appRes = AppResponse.success<FeedExpanded, unknown>({
        id: body.id,
        title: 'Update Title',
        summary: 'Update summary',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPrimaryProperty: 'updated1',
        itemSecondaryProperty: 'updated2',
        itemTemporalProperty: 'updatedTime',
        constantParams: { updated: 'yes' },
        variableParamsSchema: {
          properties: { updated: { type: 'object' } }
        },
        mapStyle: {
          icon: { id: body.mapStyle?.icon?.id! }
        },
        updateFrequencySeconds: 987,
        service: {
          id: uniqid(),
          serviceType: uniqid(),
          title: 'Test Service',
          summary: null,
          config: { test: true }
        },
        topic: {
          id: uniqid(),
          title: 'Test Topic'
        }
      })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: feedUpdate })).returns(appReq)
      appLayer.updateFeed(appReq).resolves(appRes)
      const res = await client.put(`${rootPath}/${body.id}`).send(body)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(appRes.success)
    })

    it('fails with 404 if the feed id is not found', async function () {
      const body: Required<FeedUpdateMinimal> & { superfluous: any, service: string, topic: string } = {
        id: uniqid(),
        title: 'Update Title',
        summary: 'Update summary',
        icon: { id: uniqid() },
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPrimaryProperty: 'updated1',
        itemSecondaryProperty: 'updated2',
        itemTemporalProperty: 'updatedTime',
        constantParams: { updated: 'yes' },
        variableParamsSchema: {
          properties: { updated: { type: 'object' } }
        },
        mapStyle: {
          icon: { id: uniqid() }
        },
        updateFrequencySeconds: 987,
        itemPropertiesSchema: {
          type: 'object',
          title: 'Updated Schema'
        },
        localization: {
          'x-test': { summary: 'Alt summary' }
        },
        superfluous: {
          partOfUpdate: false
        },
        service: 'service not allowed',
        topic: 'topic not allowed'
      }
      const feedUpdate: Required<FeedUpdateMinimal> = _.omit(body, 'superfluous', 'service', 'topic')
      const appReq = createAdminRequest({ feed: feedUpdate })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: feedUpdate })).returns(appReq)
      appLayer.updateFeed(appReq).resolves(AppResponse.error(entityNotFound(body.id, 'feed')))
      const res = await client.put(`${rootPath}/${body.id}`).send(body)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })
  })

  describe('DELETE /{feed}', async function () {

    it('deletes the feed for the id in the path', async function () {

      const feedId = uniqid()
      const appReq: DeleteFeedRequest = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: feedId })).returns(appReq)
      appLayer.deleteFeed(appReq).resolves(AppResponse.success(true))
      const res = await client.delete(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(/text/)
      expect(res.text).to.equal('')
    })

    it('fails with 403 without permission', async function () {
      const feedId = uniqid()
      const appReq: DeleteFeedRequest = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: feedId })).returns(appReq)
      appLayer.deleteFeed(appReq).resolves(AppResponse.error(permissionDenied('delete feed', adminPrincipal.user)))
      const res = await client.delete(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(403)
      expect(res.type).to.match(jsonMimeType)
    })

    it('fails with 404 if the feed id is not found', async function () {
      const feedId = uniqid()
      const appReq: DeleteFeedRequest = createAdminRequest({ feed: feedId })
      appRequestFactory.createRequest(Arg.any(), Arg.deepEquals({ feed: feedId })).returns(appReq)
      appLayer.deleteFeed(appReq).resolves(AppResponse.error(entityNotFound(feedId, 'feed')))
      const res = await client.delete(`${rootPath}/${feedId}`)

      expect(res.status).to.equal(404)
      expect(res.type).to.match(jsonMimeType)
    })
  })

  describe('localization', function() {

    it('passes language from accept-language header', function() {


    })
  })
})