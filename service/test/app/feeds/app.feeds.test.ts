import { describe, it, beforeEach, Context } from 'mocha'
import { expect } from 'chai'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { FeedServiceType, FeedTopic, FeedServiceTypeRepository, FeedServiceRepository, FeedServiceId, FeedServiceCreateAttrs, FeedsError, ErrInvalidServiceConfig, FeedService, FeedServiceConnection, RegisteredFeedServiceType, Feed, FeedCreateMinimal, FeedCreateUnresolved, FeedRepository, FeedId, FeedContent, FeedUpdateMinimal, FeedCreateAttrs } from '../../../lib/entities/feeds/entities.feeds'
import { ListFeedServiceTypes, CreateFeedService, ListServiceTopics, PreviewTopics, ListFeedServices, PreviewFeed, CreateFeed, ListAllFeeds, FetchFeedContent, GetFeed, UpdateFeed, DeleteFeed, GetFeedService, DeleteFeedService, ListServiceFeeds } from '../../../lib/app.impl/feeds/app.impl.feeds'
import { MageError, EntityNotFoundError, PermissionDeniedError, ErrPermissionDenied, permissionDenied, ErrInvalidInput, ErrEntityNotFound, InvalidInputError, PermissionDeniedErrorData, KeyPathError, ErrInfrastructure } from '../../../lib/app.api/app.api.errors'
import { UserId } from '../../../lib/entities/users/entities.users'
import { FeedsPermissionService, ListServiceTopicsRequest, FeedServiceTypeDescriptor, PreviewTopicsRequest, FeedPreview, FetchFeedContentRequest, FeedExpanded, GetFeedRequest, UpdateFeedRequest, DeleteFeedRequest, CreateFeedServiceRequest, GetFeedServiceRequest, DeleteFeedServiceRequest, ListServiceFeedsRequest, PreviewFeedRequest, CreateFeedRequest } from '../../../lib/app.api/feeds/app.api.feeds'
import uniqid from 'uniqid'
import { AppRequestContext, AppRequest } from '../../../lib/app.api/app.api.global'
import { FeatureCollection } from 'geojson'
import { JsonObject, JsonSchemaService, JsonValidator, JSONSchema4 } from '../../../lib/entities/entities.json_types'
import _ from 'lodash'
import { MageEventRepository } from '../../../lib/entities/events/entities.events'
import { URL } from 'url'
import { StaticIcon, StaticIconId, StaticIconImportFetch, StaticIconRepository } from '../../../lib/entities/icons/entities.icons'
import { UrlResolutionError } from '../../../lib/entities/entities.global'


function mockServiceType(descriptor: FeedServiceTypeDescriptor): SubstituteOf<RegisteredFeedServiceType> {
  const mock = Sub.for<RegisteredFeedServiceType>()
  mock.id.returns!(descriptor.id)
  mock.pluginServiceTypeId.returns!(descriptor.pluginServiceTypeId)
  mock.title.returns!(descriptor.title)
  mock.summary.returns!(descriptor.summary)
  mock.configSchema.returns!(descriptor.configSchema)
  return mock
}

const someServiceTypeDescs: FeedServiceTypeDescriptor[] = [
  Object.freeze({
    descriptorOf: 'FeedServiceType',
    id: `ogc.wfs-${uniqid()}`,
    pluginServiceTypeId: 'urn:ogc:wfs',
    title: 'OGC Web Feature Service',
    summary: 'An OGC Web Feature Service is a standard interface to query geospatial features.',
    configSchema: {
      type: 'object',
      properties: {
        url: {
          title: 'Service URL',
          summary: 'The base URL of the WFS server',
          type: 'string',
          format: 'uri',
        }
      },
      required: ['url']
    },
  }),
  Object.freeze({
    descriptorOf: 'FeedServiceType',
    id: `ogc.oaf-${uniqid()}`,
    pluginServiceTypeId: 'urn:ogc:oaf',
    title: 'OGC API - Features Service',
    summary: 'An OGC API - Features service is a standard interface to query geospatial features.  OAF is the modern evolution of WFS.',
    configSchema: {
      type: 'object',
      properties: {
        url: {
          title: 'Service URL',
          summary: 'The base URL of the OAF server',
          type: 'string',
          format: 'uri',
        }
      },
      required: ['url']
    },
  })
]

type TestPrincipal = {
  user: string
}

const adminPrincipal: TestPrincipal = {
  user: 'admin'
}

const bannedPrincipal: TestPrincipal = {
  user: 'banned'
}

function requestBy<RequestType>(principal: TestPrincipal, params?: RequestType): AppRequest<TestPrincipal> & RequestType {
  return Object.create(params || {},
    {
      context: {
        value: {
          requestToken: uniqid(),
          requestingPrincipal() {
            return principal
          },
          locale() {
            return null
          }
        }
      }
    }
  )
}

describe('feeds use case interactions', function () {

  let app: TestApp
  let someServiceTypes: SubstituteOf<RegisteredFeedServiceType>[]

  beforeEach(function () {
    app = new TestApp()
    someServiceTypes = someServiceTypeDescs.map(mockServiceType)
  })

  describe('feeds administration', function () {

    describe('listing available feed service types', async function () {

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
      })

      it('returns all the feed service types', async function () {

        const serviceTypes = await app.listServiceTypes(requestBy(adminPrincipal)).then(res => res.success)

        expect(serviceTypes).to.deep.equal(someServiceTypeDescs)
      })

      it('checks permission for listing service types', async function () {

        const error = await app.listServiceTypes(requestBy(bannedPrincipal)).then(res => res.error)

        expect(error).to.be.instanceOf(MageError)
        expect(error?.code).to.equal(ErrPermissionDenied)
      })
    })

    describe('creating a feed service', async function () {

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
      })

      it('checks permission for creating a feed service', async function () {

        const serviceType = someServiceTypes[1]
        const config = { url: 'https://does.not/matter' }
        const err = await app
          .createService(requestBy(bannedPrincipal, { serviceType: serviceType.id, title: 'Test Service', config }))
          .then(res => res.error)

        expect(err?.code).to.equal(ErrPermissionDenied)
        expect(app.serviceRepo.db).to.be.empty
        serviceType.didNotReceive().validateServiceConfig(Arg.any())
      })

      it('fails if the feed service config is invalid', async function () {

        const serviceType = someServiceTypes[0]
        const invalidConfig = {
          url: null
        }
        serviceType.validateServiceConfig(Arg.any()).resolves(new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['url'], config: invalidConfig }))
        const err = await app
          .createService(requestBy(adminPrincipal, { serviceType: serviceType.id, title: 'Test Service', config: invalidConfig }))
          .then(res => res.error as InvalidInputError)

        expect(err).to.be.instanceOf(MageError)
        expect(err.code).to.equal(ErrInvalidInput)
        expect(err.data).to.deep.equal([['url is invalid', 'config', 'url']])
        expect(app.serviceRepo.db).to.be.empty
        serviceType.received(1).validateServiceConfig(Arg.deepEquals(invalidConfig) as any)
      })

      it('fails if the feed service type does not exist', async function () {

        const invalidServiceType = `${someServiceTypes[0].id}.${uniqid()}`
        const invalidConfig = {
          url: null
        }
        const err = await app
          .createService(requestBy(adminPrincipal, { serviceType: invalidServiceType, title: 'Test Serivce', config: invalidConfig }))
          .then(res => res.error as EntityNotFoundError)

        expect(err.code).to.equal(ErrEntityNotFound)
        expect(err.data?.entityId).to.equal(invalidServiceType)
        expect(err.data?.entityType).to.equal('FeedServiceType')
        expect(app.serviceRepo.db).to.be.empty
        for (const serviceType of someServiceTypes) {
          serviceType.didNotReceive().validateServiceConfig(Arg.any())
        }
      })

      it('saves the feed service config', async function () {

        const serviceType = someServiceTypes[0]
        const config = { url: 'https://some.service/somewhere' }
        serviceType.validateServiceConfig(Arg.deepEquals(config) as any).resolves(null)
        serviceType.redactServiceConfig(Arg.any()).returns(config)

        const created = await app
          .createService(requestBy(adminPrincipal, { serviceType: serviceType.id, title: 'Test Service', config }))
          .then(res => res.success)
        const inDb = created && app.serviceRepo.db.get(created.id)

        expect(created?.id).to.exist
        expect(created).to.deep.include({
          serviceType: serviceType.id,
          title: 'Test Service',
          summary: null,
          config: config
        })
        expect(inDb).to.deep.equal(created)
      })

      it('redacts the feed service config in the result', async function () {

        const serviceType = someServiceTypes[0]
        const config = { url: 'https://lerp', secret: 'redact me' }
        serviceType.validateServiceConfig(Arg.deepEquals(config) as any).resolves(null)
        serviceType.redactServiceConfig(Arg.any()).returns(_.omit(config, 'secret'))
        const req: CreateFeedServiceRequest = requestBy(adminPrincipal, {
          serviceType: serviceType.id,
          title: 'Redact Config',
          summary: null,
          config
        })
        const res = await app.createService(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.include({
          serviceType: req.serviceType,
          title: req.title,
          summary: req.summary,
          config: {
            url: config.url
          }
        })
        serviceType.received(1).redactServiceConfig(Arg.deepEquals(req.config))
      })
    })

    describe('listing services', async function () {

      const someServices: FeedService[] = [
        {
          id: `${someServiceTypeDescs[0].id}:${uniqid()}`,
          serviceType: someServiceTypeDescs[0].id,
          title: 'WFS 1',
          summary: null,
          config: {
            url: 'https://test.mage/wfs1'
          }
        },
        {
          id: `${someServiceTypeDescs[1].id}:${uniqid()}`,
          serviceType: someServiceTypeDescs[1].id,
          title: 'OAF 1',
          summary: null,
          config: {
            url: 'https://test.mage.oaf1/api',
            apiKey: '1a2s3d4f'
          }
        }
      ]

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
        app.registerServices(...someServices)
      })

      it('checks permission for listing services', async function () {

        const bannedReq = requestBy(bannedPrincipal)
        let res = await app.listServices(bannedReq)

        expect(res.success).to.be.null
        expect(res.error).to.be.instanceOf(MageError)
        expect(res?.error?.code).to.equal(ErrPermissionDenied)

        app.permissionService.grantListServices(bannedPrincipal.user)
        res = await app.listServices(bannedReq)

        expect(res.error).to.be.null
        expect(res.success).to.be.instanceOf(Array)
      })

      it('returns the saved services', async function () {

        someServiceTypes[0].redactServiceConfig(Arg.all()).returns(someServices[0].config)
        someServiceTypes[1].redactServiceConfig(Arg.all()).returns(someServices[1].config)
        const adminReq = requestBy(adminPrincipal)
        const res = await app.listServices(adminReq)

        expect(res.error).to.be.null
        expect(res.success).to.be.instanceOf(Array)
        expect(res.success?.length).to.equal(someServices.length)
        expect(res.success).to.deep.include(someServices[0])
        expect(res.success).to.deep.include(someServices[1])
      })

      it('redacts service configurations', async function () {

        const anotherService: FeedService = {
          id: uniqid(),
          serviceType: someServiceTypes[1].id,
          title: 'Service Type 1 Service',
          summary: null,
          config: {
            secretUrl: 'https://type1.secret.net/api'
          }
        }
        app.registerServices(anotherService)
        someServiceTypes[0].redactServiceConfig(Arg.deepEquals(someServices[0].config)).returns(someServices[0].config)
        someServiceTypes[1].redactServiceConfig(Arg.deepEquals(someServices[1].config)).returns(someServices[1].config)
        someServiceTypes[1].redactServiceConfig(Arg.deepEquals(anotherService.config)).returns({})
        const req = requestBy(adminPrincipal)
        const res = await app.listServices(req)
        const services = res.success!

        const anotherServiceRedacted = Object.assign({ ...anotherService }, { config: {} })
        expect(services).to.have.length(3)
        expect(services).to.have.deep.members([
          someServices[0],
          someServices[1],
          anotherServiceRedacted
        ])
        someServiceTypes[0].received(1).redactServiceConfig(Arg.deepEquals(someServices[0].config))
        someServiceTypes[1].received(1).redactServiceConfig(Arg.deepEquals(someServices[1].config))
        someServiceTypes[1].received(1).redactServiceConfig(Arg.deepEquals(anotherService.config))
      })
    })

    describe('previewing topics', async function () {

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
      })

      it('checks permission for previewing topics', async function () {

        const serviceType = someServiceTypes[0]
        const req: PreviewTopicsRequest = requestBy(
          bannedPrincipal,
          {
            serviceType: serviceType.id,
            serviceConfig: {}
          })
        let res = await app.previewTopics(req)

        expect(res.error).to.be.instanceOf(MageError)
        expect(res.error?.code).to.equal(ErrPermissionDenied)
        expect(res.success).to.be.null

        app.permissionService.grantCreateService(bannedPrincipal.user)
        serviceType.validateServiceConfig(Arg.any()).resolves(null)
        const conn = Sub.for<FeedServiceConnection>()
        conn.fetchAvailableTopics().resolves([])
        serviceType.createConnection(Arg.all()).resolves(conn)

        res = await app.previewTopics(req)

        expect(res.success).to.be.instanceOf(Array)
        expect(res.error).to.be.null
      })

      it('fails if the service type does not exist', async function () {

        const req: PreviewTopicsRequest = requestBy(
          adminPrincipal,
          {
            serviceType: uniqid(),
            serviceConfig: {}
          })
        const res = await app.previewTopics(req)

        expect(res.success).to.be.null
        const err = res.error as EntityNotFoundError | undefined
        expect(err).to.be.instanceOf(MageError)
        expect(err?.code).to.equal(ErrEntityNotFound)
        expect(err?.data?.entityType).to.equal('FeedServiceType')
        expect(err?.data?.entityId).to.equal(req.serviceType)
      })

      it('fails if the service config is invalid', async function () {

        const serviceType = someServiceTypes[1]
        const req: PreviewTopicsRequest = requestBy(
          adminPrincipal,
          {
            serviceType: serviceType.id,
            serviceConfig: { invalid: true }
          })
        serviceType.validateServiceConfig(Arg.deepEquals(req.serviceConfig))
          .resolves(new FeedsError(ErrInvalidServiceConfig, { invalidKeys: ['invalid'], config: { invalid: true } }))

        const res = await app.previewTopics(req)

        expect(res.success).to.be.null
        const err = res.error as InvalidInputError | undefined
        expect(err).to.be.instanceOf(MageError)
        expect(err?.code).to.equal(ErrInvalidInput)
        expect(err?.data).to.deep.equal([['invalid is invalid', 'serviceConfig', 'invalid']])
      })

      it('lists the topics for the service config', async function () {

        const serviceType = someServiceTypes[1]
        const req: PreviewTopicsRequest = requestBy(
          adminPrincipal,
          {
            serviceType: serviceType.id,
            serviceConfig: { url: 'https://city.gov/emergency_response' }
          })
        const topics: FeedTopic[] = [
          {
            id: 'crime_reports',
            title: 'Criminal Activity',
            summary: 'Reports of criminal activity with locations',
            paramsSchema: {
              $ref: 'urn:mage:current_user_location'
            },
            itemsHaveIdentity: true,
            updateFrequencySeconds: 3600
          },
          {
            id: 'fire_reports',
            title: 'Fires',
            summary: 'Reports of fires',
            paramsSchema: {
              $ref: 'urn:mage:current_user_location'
            },
            itemsHaveIdentity: true,
            updateFrequencySeconds: 3600
          }
        ]
        const conn = Sub.for<FeedServiceConnection>()
        serviceType.validateServiceConfig(Arg.deepEquals(req.serviceConfig)).resolves(null)
        serviceType.createConnection(Arg.deepEquals(req.serviceConfig), Arg.any()).resolves(conn)
        conn.fetchAvailableTopics().resolves(topics)

        const res = await app.previewTopics(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.equal(topics)
      })
    })

    describe('single service operations', function () {

      const someServices: FeedService[] = [
        {
          id: `${someServiceTypeDescs[0].id}:${uniqid()}`,
          serviceType: someServiceTypeDescs[0].id,
          title: 'WFS 1',
          summary: null,
          config: {
            url: 'https://test.mage/wfs1'
          }
        },
        {
          id: `${someServiceTypeDescs[0].id}:${uniqid()}`,
          serviceType: someServiceTypeDescs[0].id,
          title: 'WFS 2',
          summary: null,
          config: {
            url: 'https://test.mage/wfs2'
          }
        }
      ]

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
        app.registerServices(...someServices)
        for (const service of someServices) {
          app.permissionService.grantListTopics(adminPrincipal.user, service.id)
        }
      })

      describe('fetching a service', function () {

        it('returns the expanded and redacted service', async function () {

          const redactedConfig = { redacted: true }
          someServiceTypes[0].redactServiceConfig(Arg.deepEquals(someServices[1].config)).returns(redactedConfig)
          const req: GetFeedServiceRequest = requestBy(adminPrincipal, { service: someServices[1].id })
          const res = await app.getService(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(res.success).to.deep.equal(Object.assign({ ...someServices[1] }, { serviceType: someServiceTypeDescs[0], config: redactedConfig }))
        })

        it('checks permission for fetching a service', async function () {

          const req: GetFeedServiceRequest = requestBy(bannedPrincipal, { service: someServices[1].id })
          let res = await app.getService(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrPermissionDenied)
          const err = res.error as PermissionDeniedError
          expect(err.data.subject).to.equal(bannedPrincipal.user)
          expect(err.data.permission).to.equal(ListFeedServices.name)

          app.permissionService.grantListServices(bannedPrincipal.user)
          someServiceTypes[0].redactServiceConfig(Arg.any()).returns(someServices[1].config)
          res = await app.getService(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
        })

        it('fails if the service does not exist', async function () {

          const req: GetFeedServiceRequest = requestBy(adminPrincipal, { service: uniqid() })
          let res = await app.getService(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrEntityNotFound)
          const err = res.error as EntityNotFoundError
          expect(err.data.entityId).to.equal(req.service)
          expect(err.data.entityType).to.equal('FeedService')
        })
      })

      describe('updating a service', function () {

        it('Not Implemented', async function () {

        })
      })

      describe('deleting a service', function () {

        it('removes the service from the repository', async function () {

          const service = someServices[1]
          const req: DeleteFeedServiceRequest = requestBy(adminPrincipal, {
            service: service.id
          })
          let inDb = app.serviceRepo.db.get(service.id)
          expect(inDb).to.deep.equal(service)

          const res = await app.deleteService(req)
          inDb = app.serviceRepo.db.get(service.id)

          expect(res.error).to.be.null
          expect(res.success).to.be.true
          expect(inDb).to.be.undefined
        })

        it('removes related feeds and their event entries', async function () {

          const service = someServices[0]
          const feeds: Feed[] = [
            {
              id: uniqid(),
              service: service.id,
              topic: uniqid(),
              title: 'Cascade Delete 1',
              itemsHaveIdentity: true,
              itemsHaveSpatialDimension: true
            },
            {
              id: uniqid(),
              service: service.id,
              topic: uniqid(),
              title: 'Cascade Delete 2',
              itemsHaveIdentity: true,
              itemsHaveSpatialDimension: true
            }
          ]
          app.registerFeeds(...feeds)
          app.eventRepo.removeFeedsFromEvents(Arg.all()).mimicks(async (...feeds: FeedId[]): Promise<number> => {
            if (app.feedRepo.db.size < 2 || !app.serviceRepo.db.has(service.id)) {
              throw new Error('remove feeds from events first')
            }
            return 2
          })
          const req: DeleteFeedServiceRequest = requestBy(adminPrincipal, {
            service: service.id
          })
          const res = await app.deleteService(req)

          expect(res.error).to.be.null
          expect(app.feedRepo.db.size).to.equal(0)
          app.eventRepo.received(1).removeFeedsFromEvents(feeds[0].id, feeds[1].id)
        })

        it('fails if the service does not exist', async function () {

          const req: DeleteFeedServiceRequest = requestBy(adminPrincipal, { service: uniqid() })
          const res = await app.deleteService(req)

          expect(res.success).to.be.null
          expect(res.error?.code).to.equal(ErrEntityNotFound)
          const err = res.error as EntityNotFoundError
          expect(err.data.entityId).to.equal(req.service)
          expect(err.data.entityType).to.equal('FeedService')
        })

        it('checks permission for deleting a service', async function () {

          const service = someServices[1]
          const req: DeleteFeedServiceRequest = requestBy(bannedPrincipal, {
            service: service.id
          })
          let inDb = app.serviceRepo.db.get(service.id)
          expect(inDb).to.deep.equal(service)

          let res = await app.deleteService(req)

          expect(res.success).to.be.null
          expect(res.error?.code).to.equal(ErrPermissionDenied)
          const err = res.error as PermissionDeniedError
          expect(err.data.subject).to.equal(bannedPrincipal.user)
          expect(err.data.permission).to.equal(CreateFeedService.name)
          inDb = app.serviceRepo.db.get(service.id)
          expect(inDb).to.deep.equal(service)
          app.eventRepo.received(0).removeFeedsFromEvents(Arg.all())

          app.permissionService.grantCreateService(bannedPrincipal.user)
          res = await app.deleteService(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.true
          inDb = app.serviceRepo.db.get(service.id)
          expect(inDb).to.be.undefined
        })
      })

      describe('listing topics from a saved service', async function () {

        it('checks permission for listing topics', async function () {

          const serviceDesc = someServices[0]
          const req: ListServiceTopicsRequest = requestBy(
            bannedPrincipal,
            {
              service: serviceDesc.id
            })
          const err = await app.listTopics(req).then(res => res.error as PermissionDeniedError)

          expect(err).to.be.instanceOf(MageError)
          expect(err.code).to.equal(ErrPermissionDenied)
          for (const serviceType of someServiceTypes) {
            serviceType.didNotReceive().createConnection(Arg.all())
          }

          const service = Sub.for<FeedServiceConnection>()
          service.fetchAvailableTopics().resolves([])
          const serviceType = someServiceTypes.filter(x => x.id === serviceDesc.serviceType)[0]
          serviceType.createConnection(Arg.deepEquals(serviceDesc.config), Arg.any()).resolves(service)
          app.permissionService.grantListTopics(bannedPrincipal.user, serviceDesc.id)

          const res = await app.listTopics(req)

          expect(res.success).to.be.instanceOf(Array)
          expect(res.success).to.have.lengthOf(0)
          expect(res.error).to.be.null
          serviceType.received(1).createConnection(Arg.all())
        })

        it('returns all the topics for a service', async function () {

          const topics: FeedTopic[] = [
            Object.freeze({
              id: 'weather_alerts',
              title: 'Weather Alerts',
              summary: 'Alerts about severe weather activity',
              constantParamsSchema: {
                type: 'number',
                title: 'Max items',
                default: 20,
                minimum: 1,
                maximum: 100
              },
              variableParamsSchema: {
                type: 'object',
                properties: {
                  '$mage:currentLocation': {
                    title: 'Current Location',
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                      type: 'number'
                    }
                  },
                  radius: {
                    title: 'Radius (Km)',
                    type: 'number',
                    default: 5,
                    minimum: 1,
                    maximum: 250
                  }
                },
                required: ['$mage:currentLocation']
              },
              updateFrequency: { seconds: 60 },
              itemsHaveIdentity: true,
              itemsHaveSpatialDimension: true,
              itemsHaveTemporalDimension: true,
              itemPrimaryProperty: 'title',
              itemSecondaryProperty: 'description'
            }),
            Object.freeze({
              id: 'quakes',
              title: 'Earthquake Alerts',
              summary: 'Alerts about seismic in a given area',
              constantParamsSchema: undefined,
              variableParamsSchema: {
                type: 'object',
                properties: {
                  '$mage:currentLocation': {
                    title: 'Current Location',
                    type: 'array',
                    minItems: 2,
                    maxItems: 2,
                    items: {
                      type: 'number'
                    }
                  }
                },
                required: ['$mage:currentLocation']
              },
              updateFrequency: undefined,
              itemsHaveIdentity: false,
              itemsHaveSpatialDimension: false,
              itemsHaveTemporalDimension: true,
              itemPrimaryProperty: 'severity',
              itemSecondaryProperty: undefined
            })
          ]
          const serviceDesc = someServices[1]
          const serviceType = someServiceTypes.filter(x => x.id === serviceDesc.serviceType)[0]
          const service = Sub.for<FeedServiceConnection>()
          serviceType.createConnection(Arg.deepEquals(serviceDesc.config), Arg.any()).resolves(service)
          service.fetchAvailableTopics().resolves(topics)
          const req: ListServiceTopicsRequest = requestBy(adminPrincipal, { service: serviceDesc.id })
          const fetched = await app.listTopics(req).then(res => res.success)

          expect(fetched).to.deep.equal(topics)
        })
      })
    })

    describe('creating a feed', function () {

      const service: FeedService = Object.freeze({
        id: uniqid(),
        serviceType: someServiceTypeDescs[0].id,
        title: 'Local Weather WFS',
        summary: 'Data about various local weather events',
        config: {
          url: 'https://weather.local.gov/wfs'
        }
      })
      const topics: FeedTopic[] = [
        Object.freeze({
          id: 'lightning',
          title: 'Lightning Strikes',
          summary: 'Locations of lightning strikes',
          itemsHaveSpatialDimension: true,
        }),
        Object.freeze({
          id: 'tornadoes',
          title: 'Tornado Touchdowns',
          summary: 'Locations and severity of tornado touchdowns',
          itemsHaveSpatialDimension: true,
        })
      ]

      let serviceConn: SubstituteOf<FeedServiceConnection>

      beforeEach(function () {
        app.registerServiceTypes(...someServiceTypes)
        app.registerServices(service)
        app.permissionService.grantCreateFeed(adminPrincipal.user, service.id)
        serviceConn = Sub.for<FeedServiceConnection>()
        someServiceTypes[0].createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(serviceConn)
      })

      type PreviewOrCreateOp = 'previewFeed' | 'createFeed'

      const sharedBehaviors: [string, (op: PreviewOrCreateOp) => any][] = [
        [
          'fails if the service type does not exist',
          async function (appOperation) {
            const service: FeedService = {
              id: 'defunct',
              serviceType: 'not there',
              title: 'Defunct',
              summary: null,
              config: null
            }
            app.registerServices(service)
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: topics[0].id
            }
            app.permissionService.grantCreateFeed(adminPrincipal.user, feed.service)

            const req = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.success).to.be.null
            const error = res.error as EntityNotFoundError
            expect(error).to.be.instanceOf(MageError)
            expect(error.code).to.equal(ErrEntityNotFound)
            expect(error.data.entityType).to.equal('FeedServiceType')
            expect(error.data.entityId).to.equal('not there')
            serviceConn.didNotReceive().fetchTopicContent(Arg.all())
          }
        ],
        [
          'fails if the service does not exist',
          async function (appOperation: PreviewOrCreateOp) {
            const feed: FeedCreateMinimal = {
              service: 'not there',
              topic: topics[0].id
            }
            app.permissionService.grantCreateFeed(adminPrincipal.user, feed.service)

            const req = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.success).to.be.null
            const error = res.error as EntityNotFoundError
            expect(error).to.be.instanceOf(MageError)
            expect(error.code).to.equal(ErrEntityNotFound)
            expect(error.data.entityType).to.equal('FeedService')
            expect(error.data.entityId).to.equal('not there')
            serviceConn.didNotReceive().fetchTopicContent(Arg.all())
          }
        ],
        [
          'fails if the topic does not exist',
          async function (appOperation: PreviewOrCreateOp) {
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: 'not there'
            }
            serviceConn.fetchAvailableTopics().resolves(topics)

            const req = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.success).to.be.null
            const error = res.error as EntityNotFoundError
            expect(error).to.be.instanceOf(MageError)
            expect(error.code).to.equal(ErrEntityNotFound)
            expect(error.data.entityType).to.equal('FeedTopic')
            expect(error.data.entityId).to.equal('not there')
            serviceConn.didNotReceive().fetchTopicContent(Arg.all())
          }
        ],
        [
          'checks permission for creating a feed',
          async function (appOperation: PreviewOrCreateOp) {
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: topics[0].id
            }

            const req = requestBy(bannedPrincipal, { feed })
            let res = await app[appOperation](req)

            expect(res.success).to.be.null
            const error = res.error
            expect(error).to.be.instanceOf(MageError)
            expect(error?.code).to.equal(ErrPermissionDenied)
            const errData = error?.data as PermissionDeniedErrorData
            expect(errData.subject).to.equal(bannedPrincipal.user)
            expect(errData.permission).to.equal(CreateFeed.name)
            expect(errData.object).to.equal(feed.service)

            serviceConn.fetchAvailableTopics().resolves(topics)
            app.permissionService.grantCreateFeed(bannedPrincipal.user, service.id)

            res = await app[appOperation](req)

            expect(res.error).to.be.null
            expect(res.success).to.be.an('object')
          }
        ],
        [
          'validates the variable params schema',
          async function (appOperation: PreviewOrCreateOp) {
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: topics[0].id,
              variableParamsSchema: {
                type: 'object',
                properties: {
                  bbox: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 4,
                    maxItems: 4
                  },
                  timestamp: {
                    type: 'number',
                    description: 'The millisecond epoch time the strike ocurred',
                    minimum: 0
                  }
                }
              }
            }
            const validationError = new Error('bad schema')
            app.jsonSchemaService.validateSchema(Arg.deepEquals(feed.variableParamsSchema)).rejects(validationError)

            const req = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.success).to.be.null
            const err = res.error as InvalidInputError
            expect(err.code).to.equal(ErrInvalidInput)
            expect(err.data.length).to.equal(1)
            expect(err.data[0]).to.have.members([validationError, 'feed', 'variableParamsSchema'])
            expect(err.message).to.match(/invalid variable parameters schema/)
            expect(err.message).to.match(/feed > variableParamsSchema: bad schema/)
          }
        ],
        [
          'does not validate the variable params schema when the schema is undefined',
          async function (appOperation: PreviewOrCreateOp) {
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: topics[0].id,
            }
            serviceConn.fetchAvailableTopics().resolves(topics)

            const req = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            expect(res.success).to.be.an('object')
            app.jsonSchemaService.didNotReceive().validateSchema(Arg.all())
          }
        ],
        [
          'registers icon for the topic',
          async function (appOperation: PreviewOrCreateOp) {
            const iconUrl = new URL('test:///register/for/preview')
            const topic = {
              ...topics[0],
              icon: { sourceUrl: iconUrl }
            }
            serviceConn.fetchAvailableTopics().resolves([topic])
            const registeredIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: iconUrl,
              registeredTimestamp: Date.now(),
              tags: []
            }
            app.iconRepo.findOrImportBySourceUrl(iconUrl, StaticIconImportFetch.EagerAwait).resolves(registeredIcon)
            const feed = {
              service: service.id,
              topic: topic.id
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            let registeredIconId: StaticIconId | undefined
            if ('feed' in res.success!) {
              registeredIconId = (res.success as FeedPreview).feed.icon!.id
            }
            else {
              registeredIconId = (res.success as FeedExpanded).icon!.id as StaticIconId
            }
            expect(registeredIconId).to.equal(registeredIcon.id)
            app.iconRepo.received(1).findOrImportBySourceUrl(iconUrl, StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.all())
          }
        ],
        [
          'registers the icon for the topic map style',
          async function (appOperation: PreviewOrCreateOp) {
            const iconUrl = new URL('test:///register/for/preview')
            const topic: FeedTopic = {
              ...topics[0],
              mapStyle: {
                icon: { sourceUrl: iconUrl }
              }
            }
            serviceConn.fetchAvailableTopics().resolves([topic])
            const registeredIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: iconUrl,
              registeredTimestamp: Date.now(),
              tags: []
            }
            app.iconRepo.findOrImportBySourceUrl(iconUrl, StaticIconImportFetch.EagerAwait).resolves(registeredIcon)
            const feed = {
              service: service.id,
              topic: topic.id
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            let resFeedIconId: StaticIconId | undefined
            let resMapIconId: StaticIconId | undefined
            if ('feed' in res.success!) {
              resFeedIconId = (res.success as FeedPreview).feed?.icon?.id
              resMapIconId = (res.success as FeedPreview).feed?.mapStyle?.icon?.id
            }
            else {
              resFeedIconId = (res.success as FeedExpanded).icon?.id
              resMapIconId = (res.success as FeedExpanded).mapStyle?.icon?.id
            }
            expect(resFeedIconId).to.be.undefined
            expect(resMapIconId).to.equal(registeredIcon.id)
            app.iconRepo.received(1).findOrImportBySourceUrl(iconUrl, StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.all())
          }
        ],
        [
          'registers icons for the topic and topic map style',
          async function (appOperation: PreviewOrCreateOp) {
            const topicIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: new URL('test:///icons/topic.png'),
              registeredTimestamp: Date.now(),
              tags: []
            }
            const mapIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: new URL('test:///icons/map_marker.png'),
              registeredTimestamp: Date.now(),
              tags: []
            }
            const topic: FeedTopic = {
              ...topics[0],
              icon: { sourceUrl: topicIcon.sourceUrl },
              mapStyle: {
                icon: { sourceUrl: mapIcon.sourceUrl }
              }
            }
            app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(topicIcon.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(topicIcon)
            app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(mapIcon.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(mapIcon)
            serviceConn.fetchAvailableTopics().resolves([topic])
            const feed = {
              service: service.id,
              topic: topic.id
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            let resFeedIconId: StaticIconId | undefined
            let resMapIconId: StaticIconId | undefined
            if ('feed' in res.success!) {
              resFeedIconId = (res.success as FeedPreview).feed?.icon?.id
              resMapIconId = (res.success as FeedPreview).feed?.mapStyle?.icon?.id
            }
            else {
              resFeedIconId = (res.success as FeedExpanded).icon?.id
              resMapIconId = (res.success as FeedExpanded).mapStyle?.icon?.id
            }
            expect(resFeedIconId).to.equal(topicIcon.id)
            expect(resMapIconId).to.equal(mapIcon.id)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(topicIcon.sourceUrl)), StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(mapIcon.sourceUrl)), StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(2).findOrImportBySourceUrl(Arg.all())
          }
        ],
        [
          'does not register any icons if they are not urls',
          async function (appOperation: PreviewOrCreateOp) {
            const topic: FeedTopic = {
              ...topics[0],
              icon: { sourceUrl: new URL('test:///icons/topic.png') },
              mapStyle: {
                icon: { sourceUrl: new URL('test:///icons/map_marker.png') }
              }
            }
            serviceConn.fetchAvailableTopics().resolves([topic])
            const feed: FeedCreateMinimal = {
              service: service.id,
              topic: topic.id,
              icon: { id: 'feed_icon' },
              mapStyle: {
                icon: { id: 'map_icon' }
              }
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            let resFeedIconId: StaticIconId | undefined
            let resMapIconId: StaticIconId | undefined
            if ('feed' in res.success!) {
              resFeedIconId = (res.success as FeedPreview).feed.icon?.id
              resMapIconId = (res.success as FeedPreview).feed.mapStyle?.icon?.id
            }
            else {
              resFeedIconId = (res.success as FeedExpanded).icon?.id
              resMapIconId = (res.success as FeedExpanded).mapStyle?.icon?.id
            }
            expect(resFeedIconId).to.equal('feed_icon')
            expect(resMapIconId).to.equal('map_icon')
            app.iconRepo.received(0).findOrImportBySourceUrl(Arg.any())
          }
        ],
        [
          'accepts and parses icon urls as strings',
          async function (appOperation: PreviewOrCreateOp) {
            const feedIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: new URL('test:///icons/topic.png'),
              registeredTimestamp: Date.now(),
              tags: []
            }
            const mapIcon: StaticIcon = {
              id: uniqid(),
              sourceUrl: new URL('test:///icons/map_marker.png'),
              registeredTimestamp: Date.now(),
              tags: []
            }
            app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedIcon.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(feedIcon)
            app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(mapIcon.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(mapIcon)
            serviceConn.fetchAvailableTopics().resolves([topics[0]])
            const feed = {
              service: service.id,
              topic: topics[0].id,
              icon: { sourceUrl: String(feedIcon.sourceUrl) },
              mapStyle: {
                icon: { sourceUrl: String(mapIcon.sourceUrl) }
              }
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed })
            const res = await app[appOperation](req)

            expect(res.error).to.be.null
            let resFeedIconId: StaticIconId | undefined
            let resMapIconId: StaticIconId | undefined
            if ('feed' in res.success!) {
              resFeedIconId = (res.success as FeedPreview).feed?.icon?.id
              resMapIconId = (res.success as FeedPreview).feed?.mapStyle?.icon?.id
            }
            else {
              resFeedIconId = (res.success as FeedExpanded).icon?.id
              resMapIconId = (res.success as FeedExpanded).mapStyle?.icon?.id
            }
            expect(resFeedIconId).to.equal(feedIcon.id)
            expect(resMapIconId).to.equal(mapIcon.id)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedIcon.sourceUrl)), StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(mapIcon.sourceUrl)), StaticIconImportFetch.EagerAwait)
            app.iconRepo.received(2).findOrImportBySourceUrl(Arg.all())
          }
        ],
        [
          'returns invalid input error if icon url strings are invalid',
          async function (appOperation: PreviewOrCreateOp) {
            const feedMod: PreviewFeedRequest['feed'] = {
              service: service.id,
              topic: topics[0].id,
              icon: { sourceUrl: 'bad url' },
              mapStyle: {
                icon: { sourceUrl: 'bad url' }
              }
            }
            const req: PreviewFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
            serviceConn.fetchAvailableTopics().resolves([topics[0]])
            const res = await app[appOperation](req)

            expect(res.success).to.be.null
            const err = res.error as InvalidInputError
            console.log(err)
            expect(err.code).to.equal(ErrInvalidInput)
            expect(err.data).to.have.lengthOf(2)
            expect(err.data).to.deep.include(['invalid icon url', 'feed', 'icon'])
            expect(err.data).to.deep.include(['invalid icon url', 'feed', 'mapStyle', 'icon'])
            app.iconRepo.didNotReceive().findOrImportBySourceUrl(Arg.all())
          }
        ]
      ]

      function testSharedBehaviorFor(this: Context, appOperation: PreviewOrCreateOp) {
        for (const test of sharedBehaviors) {
          it(test[0], test[1].bind(this, appOperation))
        }
      }

      describe('previewing the feed', function () {

        it('fetches items and creates feed preview with minimal inputs', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
          }
          const previewFeed: FeedCreateAttrs = {
            service: service.id,
            topic: topics[0].id,
            title: topics[0].title,
            summary: topics[0].summary,
            itemsHaveIdentity: false,
            itemsHaveSpatialDimension: true,
          }
          const previewItems: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [-72, 20]
                },
                properties: {
                  when: '2020-06-01T23:23:00'
                }
              }
            ]
          }
          serviceConn.fetchAvailableTopics().resolves(topics)
          serviceConn.fetchTopicContent(feed.topic, Arg.deepEquals({} as JsonObject)).resolves({
            topic: feed.topic,
            items: previewItems,
          })
          const previewContent: FeedContent = {
            feed: 'preview',
            topic: feed.topic,
            items: previewItems,
            variableParams: undefined
          }

          const req = requestBy(adminPrincipal, { feed })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success?.feed).to.deep.equal(previewFeed)
          expect(res.success?.content).to.deep.equal(previewContent)
        })

        it('applies request inputs to the feed preview', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[1].id,
            title: 'My Tornadoes',
            summary: 'Tornadoes I like',
            constantParams: {
              favoriteOf: adminPrincipal.user
            },
            variableParamsSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number'
                }
              }
            }
          }
          const variableParams = {
            limit: 10
          }
          const mergedParams = { ...feed.constantParams, ...variableParams } as JsonObject
          serviceConn.fetchAvailableTopics().resolves(topics)
          serviceConn.fetchTopicContent(topics[1].id, Arg.deepEquals(mergedParams)).resolves({
            topic: topics[1].id,
            pageCursor: null,
            items: {
              type: 'FeatureCollection',
              features: []
            }
          })
          app.jsonSchemaService.validateSchema(Arg.all()).resolves({
            validate: async () => null
          })

          const req = requestBy(adminPrincipal, {
            feed, variableParams
          })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.instanceOf(Object)
          const preview = res.success as FeedPreview
          expect(preview.feed).to.deep.include(feed)
        })

        it('validates the variable params against the variable params schema', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
            variableParamsSchema: {
              type: 'object',
              properties: {
                bbox: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 4,
                  maxItems: 4
                },
                timestamp: {
                  type: 'number',
                  description: 'The millisecond epoch time the strike ocurred',
                  minimum: 0
                }
              }
            }
          }
          const variableParams = {
            invalidParameter: true
          }
          const validationError = new Error('invalidParameter is not a valid property')
          app.jsonSchemaService.validateSchema(feed.variableParamsSchema!).resolves({
            validate: async () => validationError
          })

          const req = requestBy(adminPrincipal, { feed, variableParams })
          const res = await app.previewFeed(req)

          expect(res.success).to.be.null
          const err = res.error as InvalidInputError
          expect(err.code).to.equal(ErrInvalidInput)
          expect(err.message).to.match(/invalid variable parameters/)
          expect(err.data).to.deep.equal([
            [validationError, 'variableParams']
          ])
        })

        it('validates the merged params against the topic params schema', async function () {

          const topic: FeedTopic = {
            id: 'topic_with_params_schema',
            title: 'With Constant Params',
            paramsSchema: {
              type: 'object',
              properties: {
                apiKey: { type: 'string' },
                limit: { type: 'number' },
                bbox: {
                  title: 'Bounding Box',
                  type: 'array',
                  items: { type: 'number', minItems: 4, maxItems: 6 }
                }
              }
            }
          }
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topic.id,
            constantParams: {
              apiKey: 'abc123',
              limit: 100
            },
            variableParamsSchema: {
              type: 'object',
              properties: {
                bbox: topic.paramsSchema!.properties!.bbox
              }
            }
          }
          const variableParams = { bbox: [-22.6, 38.1, -22.5, 38.3] }
          const mergedParams = Object.assign({}, variableParams, feed.constantParams)
          const paramsValidator = Sub.for<JsonValidator>()
          const validationError = new Error('bad parameters')
          serviceConn.fetchAvailableTopics().resolves([topic])
          paramsValidator.validate(Arg.deepEquals(variableParams) as any).resolves(null)
          paramsValidator.validate(Arg.deepEquals(mergedParams)).resolves(validationError)
          app.jsonSchemaService.validateSchema(Arg.deepEquals(feed.variableParamsSchema)).resolves(paramsValidator)
          app.jsonSchemaService.validateSchema(Arg.deepEquals(topic.paramsSchema)).resolves(paramsValidator)

          const req = requestBy(adminPrincipal, { feed, variableParams })
          const res = await app.previewFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrInvalidInput)
          expect(res.error?.data).to.have.deep.members([
            [validationError, 'feed', 'constantParams'],
            [validationError, 'variableParams']
          ])
          expect(res.error?.message).to.match(/invalid parameters/)
          app.jsonSchemaService.received(1).validateSchema(Arg.deepEquals(topic.paramsSchema))
          paramsValidator.received(1).validate(Arg.deepEquals(mergedParams))
        })

        it('does not validate merged params if topic params schema is undefined', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
            variableParamsSchema: {
              properties: {
                maxAgeDays: { type: 'number' }
              }
            }
          }
          const variableParams = { maxAgeDays: 10 }
          const validator = Sub.for<JsonValidator>()
          serviceConn.fetchAvailableTopics().resolves(topics)
          app.jsonSchemaService.validateSchema(Arg.deepEquals(feed.variableParamsSchema)).resolves(validator)
          validator.validate(Arg.deepEquals(variableParams) as any).resolves(null)

          const req = requestBy(adminPrincipal, { feed, variableParams })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          app.jsonSchemaService.received(1).validateSchema(Arg.all())
          validator.received(1).validate(Arg.all())
        })

        it('prefers constant params over variable params', async function () {

          const variableParams = { limit: 1000 }
          const constantParams = { limit: 25 }
          const topic: FeedTopic = Object.assign({
            paramsSchema: {
              properties: {
                limit: { type: 'number' }
              }
            }
          }, topics[0])
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
            constantParams,
            variableParamsSchema: {}
          }
          const mergedValidator = Sub.for<JsonValidator>()
          const variableValidator = Sub.for<JsonValidator>()
          serviceConn.fetchAvailableTopics().resolves([topic])
          app.jsonSchemaService.validateSchema(Arg.deepEquals(topic.paramsSchema)).resolves(mergedValidator)
          app.jsonSchemaService.validateSchema(Arg.deepEquals(feed.variableParamsSchema)).resolves(variableValidator)
          mergedValidator.validate(Arg.all()).resolves(null)
          variableValidator.validate(Arg.all()).resolves(null)

          const req = requestBy(adminPrincipal, {
            feed,
            variableParams
          })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          mergedValidator.received(1).validate(Arg.all())
          mergedValidator.received(1).validate(Arg.deepEquals(constantParams) as any)
        })

        it('does not save the preview feed', async function () {

          const feed = {
            service: service.id,
            topic: topics[0].id
          }
          serviceConn.fetchAvailableTopics().resolves(topics)
          serviceConn.fetchTopicContent(Arg.all()).resolves({
            topic: feed.topic,
            items: {
              type: 'FeatureCollection',
              features: []
            }
          })

          const req = requestBy(adminPrincipal, { feed })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(app.feedRepo.db).to.be.empty
        })

        it('does not fetch content when skip flag is true', async function () {

          const variableParams = { limit: 1000, timestampBetween: [12345, 23456] }
          const constantParams = { limit: 25 }
          const topic: FeedTopic = Object.assign({
            paramsSchema: {
              properties: {
                limit: { type: 'number' },
                timestampBetween: { type: 'array', items: { type: 'number' } }
              }
            }
          }, topics[0])
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
            constantParams,
            variableParamsSchema: {
              properties: {
                timestampBetween: { type: 'array', items: { type: 'number' } }
              }
            }
          }
          const mergedValidator = Sub.for<JsonValidator>()
          const variableValidator = Sub.for<JsonValidator>()
          serviceConn.fetchAvailableTopics().resolves([topic])
          app.jsonSchemaService.validateSchema(Arg.deepEquals(topic.paramsSchema)).resolves(mergedValidator)
          app.jsonSchemaService.validateSchema(Arg.deepEquals(feed.variableParamsSchema)).resolves(variableValidator)
          mergedValidator.validate(Arg.all()).resolves(null)
          variableValidator.validate(Arg.all()).resolves(null)

          const req = requestBy(adminPrincipal, {
            feed,
            variableParams,
            skipContentFetch: true
          })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(res.success?.feed).to.deep.equal(FeedCreateAttrs(FeedCreateUnresolved(topics[0], feed) as FeedCreateUnresolved, {}))
          expect(res.success).to.not.have.key('content')
          serviceConn.received(1).fetchAvailableTopics()
          app.jsonSchemaService.received(1).validateSchema(Arg.deepEquals(topic.paramsSchema))
          app.jsonSchemaService.received(1).validateSchema(Arg.deepEquals(feed.variableParamsSchema))
          variableValidator.received(1).validate(Arg.deepEquals(variableParams) as any)
          mergedValidator.received(1).validate(Arg.deepEquals({ ...variableParams, ...constantParams } as any))
          serviceConn.didNotReceive().fetchTopicContent(Arg.all())
        })

        it('does not skip fetching the content if the skip is not strictly equal to true', async function () {

          const topic: FeedTopic = topics[0]
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[0].id,
          }
          serviceConn.fetchAvailableTopics().resolves([topic])
          serviceConn.fetchTopicContent(topic.id, Arg.deepEquals({} as JsonObject)).resolves({
            topic: topic.id,
            items: <FeatureCollection<any>>{
              type: 'FeatureCollection',
              features: [
                { id: 'notSkipped', type: 'Feature', geometry: null }
              ]
            }
          })
          const req = requestBy(adminPrincipal, {
            feed,
            skipContentFetch: 'truthy' as unknown as boolean
          })
          const res = await app.previewFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(res.success?.feed).to.deep.equal(FeedCreateAttrs(FeedCreateUnresolved(topics[0], feed) as FeedCreateUnresolved, {}))
          expect(res.success?.content).to.deep.equal(<FeedContent>{
            feed: 'preview',
            topic: topic.id,
            variableParams: undefined,
            items: <FeatureCollection<any>>{
              type: 'FeatureCollection',
              features: [
                { id: 'notSkipped', type: 'Feature', geometry: null }
              ]
            }
          })
          serviceConn.received(1).fetchAvailableTopics()
          serviceConn.received(1).fetchTopicContent(Arg.all())
        })

        describe('behaviors shared with creating a feed', function () {
          testSharedBehaviorFor.call(this.ctx, 'previewFeed')
        })
      })

      describe('saving the feed', function () {

        it('saves the feed with minimal inputs', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[1].id
          }
          serviceConn.fetchAvailableTopics().resolves(topics)

          const req = requestBy(adminPrincipal, { feed })
          const res = await app.createFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.instanceOf(Object)
          const created = res.success!
          expect(created.id).to.be.a('string')
          expect(created.id).to.not.equal('preview')
          expect(created).to.deep.include({
            service,
            topic: topics[1],
            title: topics[1].title,
            summary: topics[1].summary,
            itemsHaveIdentity: false,
            itemsHaveSpatialDimension: true,
          })
          const inDb = app.feedRepo.db.get(created.id)
          expect(inDb).to.deep.include({ ...created, service: created.service.id, topic: created.topic.id })
        })

        it('saves a feed from a preview', async function () {

          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[1].id,
            title: 'Save From Preview',
            constantParams: {
              limit: 50
            },
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }
          serviceConn.fetchAvailableTopics().resolves(topics)

          const previewReq = requestBy(adminPrincipal, { feed, variableParams: { bbox: [20, 20, 21, 21] } })
          const previewRes = await app.previewFeed(previewReq)

          expect(previewRes.error).to.be.null
          expect(previewRes.success).to.be.an('object')

          const previewFeed = previewRes.success?.feed as FeedCreateAttrs

          const createReq = requestBy(adminPrincipal, { feed: previewFeed })
          const createRes = await app.createFeed(createReq)

          expect(createRes.error).to.be.null
          expect(createRes.success).to.be.an('object')
          expect(createRes.success).to.deep.include({ ...feed, service, topic: topics[1] })
          expect(app.feedRepo.db.get(createRes.success!.id)).to.deep.include(feed)
        })

        it('registers the topic icon for immediate fetch', async function () {

          const icon: StaticIcon = {
            id: uniqid(),
            sourceUrl: new URL('test:///icon.png'),
            registeredTimestamp: Date.now()
          }
          const topic = { ...topics[1], icon: { sourceUrl: icon.sourceUrl } }
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: topics[1].id,
            title: 'Save From Preview',
            constantParams: {
              limit: 50
            },
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }
          const req: CreateFeedRequest = requestBy(adminPrincipal, { feed })
          serviceConn.fetchAvailableTopics().resolves([topic])
          app.iconRepo.findOrImportBySourceUrl(
            Arg.is(x => String(x) === String(topic.icon.sourceUrl)),
            Arg.is(x => x === StaticIconImportFetch.EagerAwait)
          ).resolves(icon)
          const res = await app.createFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(res.success?.icon).to.deep.equal({ id: icon.id })
          app.iconRepo.received(1).findOrImportBySourceUrl(
            Arg.is(x => String(x) === String(topic.icon.sourceUrl)),
            Arg.is(x => x === StaticIconImportFetch.EagerAwait))
        })

        it('registers the feed icon url for immediate fetch', async function () {
          const icon: StaticIcon = {
            id: uniqid(),
            sourceUrl: new URL('test:///icon.png'),
            registeredTimestamp: Date.now()
          }
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: uniqid(),
            title: 'Save From Preview',
            constantParams: {
              limit: 50
            },
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            icon: {
              sourceUrl: new URL('test:///icon.png')
            }
          }
          const req: CreateFeedRequest = requestBy(adminPrincipal, { feed })
          app.iconRepo.findOrImportBySourceUrl(
            Arg.is(x => String(x) === String(feed.icon?.sourceUrl)),
            Arg.is(x => x === StaticIconImportFetch.EagerAwait)
          ).resolves(icon)
          const res = await app.createFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.an('object')
          expect(res.success?.icon).to.deep.equal({ id: icon.id })
          app.iconRepo.received(1).findOrImportBySourceUrl(
            Arg.is(x => String(x) === String(feed.icon?.sourceUrl)),
            Arg.is(x => x === StaticIconImportFetch.EagerAwait))
        })

        it('fails if the immediate icon fetch fails', async function () {
          const feed: FeedCreateMinimal = {
            service: service.id,
            topic: uniqid(),
            title: 'Save From Preview',
            constantParams: {
              limit: 50
            },
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            icon: {
              sourceUrl: new URL('test:///icon.png')
            }
          }
          const req: CreateFeedRequest = requestBy(adminPrincipal, { feed })
          app.iconRepo.findOrImportBySourceUrl(
            Arg.is(x => String(x) === String(feed.icon?.sourceUrl)),
            Arg.is(x => x === StaticIconImportFetch.EagerAwait)
          ).resolves(new UrlResolutionError(new URL('test:///icon.png')))
          const res = await app.createFeed(req)

          expect(res.success).to.be.null
          const err = res.error as EntityNotFoundError | undefined
          expect(err).to.be.instanceOf(MageError)
        })

        describe('behaviors shared with previewing a feed', function () {
          testSharedBehaviorFor.call(this.ctx, 'createFeed')
        })
      })
    })

    describe('single feed operations', function () {

      let feeds: Feed[]
      let services: { service: FeedService, topics: Required<FeedTopic>[], conn: SubstituteOf<FeedServiceConnection> }[]

      beforeEach(function () {
        services = [
          {
            service: Object.freeze({
              id: uniqid(),
              serviceType: someServiceTypes[1].id,
              title: 'News 1',
              summary: null,
              config: { url: 'https://test.service1', secret: uniqid() },
            }),
            topics: [
              Object.freeze({
                id: uniqid(),
                title: 'News 1 Politics',
                summary: 'News on politics 1',
                icon: { sourceUrl: iconUrl() },
                itemPrimaryProperty: 'topic1:primary',
                itemSecondaryProperty: 'topic1:secondary',
                itemTemporalProperty: 'topic1:published',
                itemsHaveIdentity: false,
                itemsHaveSpatialDimension: true,
                paramsSchema: {
                  title: 'Topic 1 Params'
                },
                mapStyle: {
                  icon: { sourceUrl: new URL('test:///topic1.png') }
                },
                updateFrequencySeconds: 5 * 60,
                itemPropertiesSchema: {
                  type: 'object',
                  title: 'Topic 1 Item Properties'
                },
                localization: {
                  'x-fler': { title: 'Title in Fler' }
                }
              })
            ],
            conn: Sub.for<FeedServiceConnection>(),
          },
          {
            service: Object.freeze({
              id: uniqid(),
              serviceType: someServiceTypes[1].id,
              title: 'News 2',
              summary: null,
              config: { url: 'https://test.service2' },
            }),
            topics: [
              Object.freeze({
                id: uniqid(),
                title: 'News 2 Sports',
                summary: 'News on sports 2',
                icon: { sourceUrl: iconUrl() },
                itemPrimaryProperty: 'topic2:primary',
                itemSecondaryProperty: 'topic2:secondary',
                itemTemporalProperty: 'topic2:published',
                itemsHaveIdentity: false,
                itemsHaveSpatialDimension: true,
                paramsSchema: {
                  title: 'Topic 2 Params'
                },
                mapStyle: {
                  icon: { sourceUrl: new URL('test:///topic2.png') }
                },
                updateFrequencySeconds: 15 * 60,
                itemPropertiesSchema: {
                  type: 'object',
                  title: 'Topic 2 Item Properties'
                },
                localization: {
                  'x-borp': { title: 'TItle in Borp' }
                }
              })
            ],
            conn: Sub.for<FeedServiceConnection>(),
          }
        ]
        feeds = [
          Object.freeze({
            id: uniqid(),
            title: 'Politics',
            service: services[0].service.id,
            topic: services[0].topics[0].id,
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: false,
            variableParamsSchema: {
              properties: {
                search: { type: 'string' }
              }
            }
          }),
          Object.freeze({
            id: uniqid(),
            title: 'Sports',
            service: services[1].service.id,
            topic: services[1].topics[0].id,
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            constantParams: {
              limit: 50
            },
            updateFrequencySeconds: 10 * 60
          })
        ]
        app.registerServiceTypes(...someServiceTypes)
        app.registerServices(...services.map(x => x.service))
        app.registerFeeds(...feeds)
        const serviceType = someServiceTypes[1]
        for (const serviceTuple of services) {
          serviceType.createConnection(Arg.deepEquals(serviceTuple.service.config), Arg.any()).resolves(serviceTuple.conn)
          serviceTuple.conn.fetchAvailableTopics().resolves(serviceTuple.topics)
        }
      })

      describe('getting an expanded feed', function () {

        it('returns the feed with redacted service and topic populated', async function () {

          const redactedConfig = { redacted: true }
          const feedExpanded: FeedExpanded = Object.assign({ ...feeds[0] }, {
            service: Object.assign({ ...services[0].service }, { config: redactedConfig }),
            topic: { ...services[0].topics[0] }
          })
          someServiceTypes[1].redactServiceConfig(Arg.deepEquals(services[0].service.config)).returns(redactedConfig)
          const req: GetFeedRequest = requestBy(adminPrincipal, { feed: feeds[0].id })
          const res = await app.getFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.deep.equal(feedExpanded)
          someServiceTypes[1].received(1).redactServiceConfig(Arg.deepEquals(services[0].service.config))
        })

        it('checks permission for getting the feed', async function () {

          app.permissionService.revokeListFeeds(adminPrincipal.user)
          const req: GetFeedRequest = requestBy(adminPrincipal, { feed: feeds[0].id })
          const res = await app.getFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrPermissionDenied)
        })
      })

      describe('updating a feed', function () {

        beforeEach(function () {
          app.permissionService.grantCreateFeed(adminPrincipal.user, feeds[0].service)
          app.permissionService.grantCreateFeed(adminPrincipal.user, feeds[1].service)
        })

        it('saves the new feed attributes', async function () {

          const feedMod: Omit<Required<FeedUpdateMinimal>, 'service' | 'topic'> = {
            id: feeds[1].id,
            title: 'Updated Feed',
            summary: 'Test updateds',
            icon: { id: uniqid() },
            itemPrimaryProperty: 'updated1',
            itemSecondaryProperty: 'updated2',
            itemTemporalProperty: 'updatedTemporal',
            itemsHaveIdentity: !feeds[1].itemsHaveIdentity,
            itemsHaveSpatialDimension: !feeds[1].itemsHaveSpatialDimension,
            constantParams: {
              updated: true
            },
            variableParamsSchema: {
              properties: {
                test: { type: 'string' }
              }
            },
            mapStyle: {
              fill: 'updated-green'
            },
            updateFrequencySeconds: 357,
            itemPropertiesSchema: {
              type: 'object',
              title: 'Updated Item Properties'
            },
            localization: {
              'x-goor': { title: 'Title in Goor' }
            }
          }
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          const expanded = Object.assign({ ...feedMod }, { service: services[1].service, topic: services[1].topics[0] })
          const referenced = Object.assign({ ...feedMod }, { service: feeds[1].service, topic: feeds[1].topic })
          const inDb = app.feedRepo.db.get(feeds[1].id)
          expect(res.error).to.be.null
          expect(res.success).to.deep.equal(expanded)
          expect(inDb).to.deep.equal(referenced)
        })

        it('does not allow changing the service and topic', async function () {

          const feedMod: FeedUpdateMinimal & Pick<Feed, 'service' | 'topic'> = Object.freeze({
            id: feeds[0].id,
            service: feeds[0].service + '-mod',
            topic: feeds[0].topic + '-mod'
          })
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrInvalidInput)
          expect(res.error?.message).to.contain('service')
          expect(res.error?.message).to.contain('topic')
          const errData = res.error?.data as KeyPathError[]
          expect(errData).to.have.deep.members([
            ['changing feed service is not allowed', 'feed', 'service'],
            ['changing feed topic is not allowed', 'feed', 'topic']
          ])
          const inDb = app.feedRepo.db.get(feeds[0].id)
          expect(inDb).to.deep.equal(feeds[0])
        })

        it('accepts service and topic if they match the existing feed', async function () {

          const feedMod: FeedUpdateMinimal & Pick<Feed, 'service' | 'topic'> = Object.freeze({
            id: feeds[0].id,
            service: feeds[0].service,
            topic: feeds[0].topic,
            title: feeds[0].title + ' updated',
            icon: null,
            mapStyle: null
          })
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.deep.include({ id: feedMod.id, title: feedMod.title, service: services[0].service, topic: services[0].topics[0] })
          const inDb = app.feedRepo.db.get(feedMod.id)
          expect(inDb).to.deep.include({ id: feedMod.id, title: feedMod.title, service: feedMod.service, topic: feedMod.topic })
        })

        it('applies topic attributes for attributes the update does not specify', async function () {

          const feedMod: FeedUpdateMinimal = {
            id: feeds[1].id
          }
          const topicIcon: StaticIcon = {
            id: uniqid(),
            sourceUrl: services[1].topics[0].icon.sourceUrl,
            registeredTimestamp: Date.now()
          }
          const mapIcon: StaticIcon = {
            id: uniqid(),
            sourceUrl: services[1].topics[0].mapStyle.icon!.sourceUrl,
            registeredTimestamp: Date.now()
          }
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(services[1].topics[0].icon.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(topicIcon)
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(services[1].topics[0].mapStyle?.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(mapIcon)
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          const withTopicAttrs = FeedCreateAttrs(
            FeedCreateUnresolved(services[1].topics[0], { ...feedMod, service: feeds[1].service, topic: feeds[1].topic }) as FeedCreateUnresolved,
            { [String(topicIcon.sourceUrl)]: topicIcon.id, [String(mapIcon.sourceUrl)]: mapIcon.id })
          withTopicAttrs.id = feedMod.id
          const expanded = Object.assign({ ...withTopicAttrs }, { service: services[1].service, topic: services[1].topics[0] })
          const inDb = app.feedRepo.db.get(feeds[1].id)
          expect(res.error).to.be.null
          expect(res.success).to.deep.equal(expanded)
          expect(inDb).to.deep.equal(withTopicAttrs)
          app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(services[1].topics[0].icon.sourceUrl)), StaticIconImportFetch.EagerAwait)
          app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(services[1].topics[0].mapStyle?.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait)
          app.iconRepo.received(2).findOrImportBySourceUrl(Arg.all())
        })

        it('does not apply topic attributes for explicit null update keys', async function () {

          const feedMod: Required<FeedUpdateMinimal> = {
            id: feeds[0].id,
            title: 'Override with Null',
            summary: null,
            constantParams: null,
            variableParamsSchema: null,
            itemPrimaryProperty: null,
            itemSecondaryProperty: null,
            itemPropertiesSchema: null,
            itemTemporalProperty: null,
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            icon: null,
            mapStyle: null,
            updateFrequencySeconds: null,
            localization: null
          }
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          const expected: Feed = {
            id: feeds[0].id,
            service: feeds[0].service,
            topic: feeds[0].topic,
            title: feedMod.title,
            itemsHaveIdentity: feedMod.itemsHaveIdentity,
            itemsHaveSpatialDimension: feedMod.itemsHaveSpatialDimension
          }
          const inDb = app.feedRepo.db.get(feeds[0].id)
          expect(inDb).to.deep.equal(expected)
          expect(res.success).to.deep.equal(Object.assign({ ...expected }, { service: services[0].service, topic: services[0].topics[0] }))
        })

        it('registers updated icon urls', async function () {

          const feedMod: FeedUpdateMinimal = {
            id: feeds[0].id,
            summary: null,
            icon: { sourceUrl: new URL(`test:///${uniqid()}.png`) },
            mapStyle: {
              icon: { sourceUrl: new URL(`test:///${uniqid()}.png`) }
            },
            constantParams: null,
            variableParamsSchema: null,
            itemPrimaryProperty: null,
            itemSecondaryProperty: null,
            itemTemporalProperty: null,
            itemPropertiesSchema: null,
            updateFrequencySeconds: null,
          }
          const feedIcon: StaticIcon = {
            id: uniqid(),
            sourceUrl: feedMod.icon!.sourceUrl!,
            registeredTimestamp: Date.now()
          }
          const mapIcon: StaticIcon = {
            id: uniqid(),
            sourceUrl: feedMod.mapStyle!.icon!.sourceUrl!,
            registeredTimestamp: Date.now()
          }
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedMod.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(feedIcon)
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedMod.mapStyle?.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait).resolves(mapIcon)
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.deep.equal({
            id: feeds[0].id,
            service: services[0].service,
            topic: services[0].topics[0],
            title: services[0].topics[0].title,
            itemsHaveIdentity: services[0].topics[0].itemsHaveIdentity,
            itemsHaveSpatialDimension: services[0].topics[0].itemsHaveSpatialDimension,
            icon: { id: feedIcon.id },
            mapStyle: {
              icon: { id: mapIcon.id }
            },
            localization: services[0].topics[0].localization
          })
          app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedMod.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait)
          app.iconRepo.received(1).findOrImportBySourceUrl(Arg.is(x => String(x) === String(feedMod.mapStyle?.icon?.sourceUrl)), StaticIconImportFetch.EagerAwait)
          app.iconRepo.received(2).findOrImportBySourceUrl(Arg.all())
        })

        it('accepts and parses icon urls as strings', async function () {

          const feedMod: UpdateFeedRequest['feed'] = {
            id: feeds[0].id,
            icon: { sourceUrl: 'test://icons/parse1' },
            mapStyle: {
              icon: { sourceUrl: 'test://icons/parse2' }
            }
          }
          const parsedIcon = new URL(feedMod.icon?.sourceUrl as string)
          const parsedMapIcon = new URL(feedMod.mapStyle?.icon?.sourceUrl as string)
          const iconId = uniqid()
          const mapIconId = uniqid()
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(parsedIcon)), Arg.any()).resolves({ id: iconId } as StaticIcon)
          app.iconRepo.findOrImportBySourceUrl(Arg.is(x => String(x) === String(parsedMapIcon)), Arg.any()).resolves({ id: mapIconId } as StaticIcon)
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.deep.include({
            id: feeds[0].id,
            icon: { id: iconId },
            mapStyle: {
              icon: { id: mapIconId }
            }
          })
        })

        it('returns invalid input error if icon url strings are invalid', async function () {

          const feedMod: UpdateFeedRequest['feed'] = {
            id: feeds[0].id,
            icon: { sourceUrl: 'bad url' },
            mapStyle: {
              icon: { sourceUrl: 'bad url' }
            }
          }
          const req: UpdateFeedRequest = requestBy(adminPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.success).to.be.null
          const err = res.error as InvalidInputError
          expect(err.code).to.equal(ErrInvalidInput)
          expect(err.data).to.have.lengthOf(2)
          expect(err.data).to.deep.include(['invalid icon url', 'feed', 'icon'])
          expect(err.data).to.deep.include(['invalid icon url', 'feed', 'mapStyle', 'icon'])
          app.iconRepo.didNotReceive().findOrImportBySourceUrl(Arg.all())
        })

        it('checks permission for updating the feed', async function () {

          const feedMod: FeedUpdateMinimal = {
            id: feeds[0].id,
          }
          const req: UpdateFeedRequest = requestBy(bannedPrincipal, { feed: feedMod })
          const res = await app.updateFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrPermissionDenied)
          const inDb = app.feedRepo.db.get(feeds[0].id)
          expect(inDb).to.deep.equal(feeds[0])
        })
      })

      describe('deleting a feed', function () {

        beforeEach(function () {
          app.permissionService.grantCreateFeed(adminPrincipal.user, services[0].service.id)
          app.permissionService.grantCreateFeed(adminPrincipal.user, services[1].service.id)
        })

        it('deletes the feed id from referencing events then the feed', async function () {

          app.eventRepo.removeFeedsFromEvents(Arg.any()).mimicks(async (feed: FeedId): Promise<number> => {
            if (!app.feedRepo.db.has(feed)) {
              throw new Error('remove feed from events before deleting')
            }
            return 0
          })
          const req: DeleteFeedRequest = requestBy(adminPrincipal, { feed: feeds[0].id })
          const res = await app.deleteFeed(req)

          expect(res.error).to.be.null
          expect(res.success).to.be.true
          const inDb = app.feedRepo.db.get(feeds[0].id)
          expect(inDb).to.be.undefined
          app.eventRepo.received(1).removeFeedsFromEvents(req.feed)
        })

        it('checks permission for deleting a feed', async function () {

          const req: DeleteFeedRequest = requestBy(bannedPrincipal, { feed: feeds[1].id })
          const res = await app.deleteFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrPermissionDenied)
          const err = res.error as PermissionDeniedError
          expect(err.data.subject).to.equal(bannedPrincipal.user)
          expect(err.data.permission).to.equal(CreateFeed.name)
          expect(err.data.object).to.equal(feeds[1].service)
          const inDb = app.feedRepo.db.get(req.feed)
          expect(inDb).to.deep.equal(feeds[1])
        })

        it('fails if the feed id is not found', async function () {

          const req: DeleteFeedRequest = requestBy(adminPrincipal, { feed: feeds[0].id + '-nope' })
          const res = await app.deleteFeed(req)

          expect(res.success).to.be.null
          expect(res.error).to.be.instanceOf(MageError)
          expect(res.error?.code).to.equal(ErrEntityNotFound)
          const err = res.error as EntityNotFoundError
          expect(err.data.entityId).to.equal(req.feed)
          expect(err.data.entityType).to.equal('Feed')
        })
      })
    })


    describe('listing all feeds', function () {

      it('returns all the feeds', async function () {

        const feeds: Feed[] = [
          {
            id: uniqid(),
            title: 'Test Feed 1',
            summary: 'First test feed',
            service: uniqid(),
            topic: 'topic1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: false
          },
          {
            id: uniqid(),
            title: 'Test Feed 2',
            summary: 'Second test feed',
            service: uniqid(),
            topic: 'topic1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            constantParams: {
              limit: 100
            },
            updateFrequencySeconds: 3600
          }
        ]
        app.registerFeeds(...feeds)
        const req = requestBy(adminPrincipal)
        const res = await app.listFeeds(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.equal(feeds)
      })

      it('checks permission for listing all feeds', async function () {

        const req = requestBy(bannedPrincipal)
        let res = await app.listFeeds(req)

        expect(res.success).to.be.null
        expect(res.error).to.be.instanceOf(MageError)
        expect(res.error?.code).to.equal(ErrPermissionDenied)
        expect(res.error?.data.subject).to.equal(bannedPrincipal.user)
        expect(res.error?.data.permission).to.equal(ListAllFeeds.name)
        expect(res.error?.data.object).to.be.null

        app.permissionService.grantListFeeds(bannedPrincipal.user)

        res = await app.listFeeds(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.equal([])
      })

      xit('returns all the feeds grouped under populated service', async function () {
        expect.fail('todo: this would probably be more useful; maybe even all service types, services, feeds, and even cached topic descriptors')
      })
    })

    describe('listing feeds for a service', function () {

      let targetService: FeedServiceId
      let serviceFeeds: Feed[]
      let otherFeed: Feed

      beforeEach(function () {
        targetService = uniqid()
        serviceFeeds = [
          {
            id: uniqid(),
            service: targetService,
            topic: uniqid(),
            title: 'Feed 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          },
          {
            id: uniqid(),
            service: targetService,
            topic: uniqid(),
            title: 'Feed 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }
        ]
        otherFeed = {
          id: uniqid(),
          service: uniqid(),
          topic: uniqid(),
          title: 'Other 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        }
        app.registerFeeds(...serviceFeeds, otherFeed)
        app.registerServices(
          {
            id: targetService,
            serviceType: uniqid(),
            title: 'Service 1',
            summary: null,
            config: {},
          },
          {
            id: uniqid(),
            serviceType: uniqid(),
            title: 'Service 2',
            summary: null,
            config: {}
          })
      })

      it('returns all the feeds that reference a service', async function () {

        const req: ListServiceFeedsRequest = requestBy(adminPrincipal, { service: targetService })
        const res = await app.listServiceFeeds(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.equal(serviceFeeds)
      })

      it('checks permission for listing service feeds', async function () {

        const req: ListServiceFeedsRequest = requestBy(bannedPrincipal, { service: targetService })
        let res = await app.listServiceFeeds(req)

        expect(res.success).to.be.null
        expect(res.error).to.be.instanceOf(MageError)
        expect(res.error?.code).to.equal(ErrPermissionDenied)
        const err = res.error as PermissionDeniedError
        expect(err.data.subject).to.equal(bannedPrincipal.user)
        expect(err.data.permission).to.equal(ListAllFeeds.name)

        app.permissionService.grantListFeeds(bannedPrincipal.user)
        res = await app.listServiceFeeds(req)

        expect(res.error).to.be.null
        expect(res.success).to.deep.equal(serviceFeeds)
      })

      it('fails if the service does not exist', async function () {

        const req: ListServiceFeedsRequest = requestBy(adminPrincipal, { service: uniqid() })
        const res = await app.listServiceFeeds(req)

        expect(res.success).to.be.null
        expect(res.error).to.be.instanceOf(MageError)
        expect(res.error?.code).to.equal(ErrEntityNotFound)
        const err = res.error as EntityNotFoundError
        expect(err.data.entityId).to.equal(req.service)
        expect(err.data.entityType).to.equal('FeedService')
      })
    })
  })

  describe('fetching feed content', function () {

    let serviceType: SubstituteOf<RegisteredFeedServiceType>
    let feed: Feed
    let service: FeedService

    beforeEach(function () {
      serviceType = someServiceTypes[0]
      feed = {
        id: uniqid(),
        service: uniqid(),
        topic: 'crimes',
        title: 'Robberies',
        constantParams: {
          type: 'robbery'
        },
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemTemporalProperty: 'when',
        itemPrimaryProperty: 'address',
      }
      service = {
        id: feed.service,
        serviceType: serviceType.id,
        title: 'Test Service',
        summary: 'For testing',
        config: {
          url: 'https://mage.test/service/' + uniqid()
        }
      }
      app.registerServiceTypes(serviceType)
      app.registerServices(service)
      app.registerFeeds(feed)
      app.permissionService.grantFetchFeedContent(adminPrincipal.user, feed.id)
    })

    it('fetches content from the feed topic', async function () {

      const expectedContent: FeedContent = {
        feed: feed.id,
        topic: feed.topic,
        variableParams: {
          bbox: [-120, 40, -119, 41],
          maxAgeInDays: 3
        },
        items: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [-119.67, 40.25]
              },
              properties: {
                when: Date.now() - 1000 * 60 * 60 * 13,
                address: '123 Test Ave. Testington, Wadata 56789'
              }
            }
          ]
        }
      }
      const mergedParams = Object.assign({ ...expectedContent.variableParams }, feed.constantParams)
      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().resolves([
        { id: feed.topic } as FeedTopic
      ])
      conn.fetchTopicContent(feed.topic, mergedParams).resolves(expectedContent)
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, {
        feed: feed.id,
        variableParams: expectedContent.variableParams
      })
      const res = await app.fetchFeedContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(expectedContent)
    })

    it('validates the parameters', async function () {

      const expectedContent: FeedContent = {
        feed: feed.id,
        topic: feed.topic,
        variableParams: {
          bbox: [-120, 40, -119, 41],
          maxAgeInDays: 3
        },
        items: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [-119.67, 40.25]
              },
              properties: {
                when: Date.now() - 1000 * 60 * 60 * 13,
                address: '123 Test Ave. Testington, Wadata 56789'
              }
            }
          ]
        },
        pageCursor: {}
      }
      const mergedParams = Object.assign({ ...expectedContent.variableParams }, feed.constantParams)
      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().resolves([
        { id: feed.topic } as FeedTopic
      ])
      conn.fetchTopicContent(feed.topic, mergedParams).resolves(expectedContent)
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, {
        feed: feed.id,
        variableParams: expectedContent.variableParams
      })
      const res = await app.fetchFeedContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(expectedContent)
    })

    it('checks permission to fetch feed content', async function () {

      const req: FetchFeedContentRequest = requestBy(bannedPrincipal, { feed: feed.id })
      let res = await app.fetchFeedContent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      const data = res.error?.data as PermissionDeniedErrorData
      expect(data.permission).to.equal(FetchFeedContent.name)
      expect(data.subject).to.equal(bannedPrincipal.user)
      expect(data.object).to.equal(feed.id)

      app.permissionService.grantFetchFeedContent(bannedPrincipal.user, feed.id)
      res = await app.fetchFeedContent(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('object')
    })

    it('removes properties that the feed does not define', async function () {

      const itemPropertiesSchema: JSONSchema4 = {
        type: 'object',
        properties: {
          prop1: { type: 'string' },
          prop2: { type: 'number' },
          prop3: { type: 'boolean' }
        }
      }
      const definedPropertiesFeed: Feed = {
        ..._.cloneDeep(feed),
        id: uniqid(),
        itemPropertiesSchema
      }
      const extraPropertiesContent: FeedContent = {
        topic: feed.topic,
        feed: definedPropertiesFeed.id,
        items: {
          type: 'FeatureCollection',
          features: [
            {
              id: 100,
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [1, 2] },
              properties: {
                prop1: 'nor',
                prop2: 10,
                prop3: false,
                wut: 'sup'
              }
            },
            {
              id: 200,
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [10, 20] },
              properties: {
                prop1: 'ler',
                prop2: 9,
                wait: 'wut'
              }
            },
          ]
        }
      }
      app.registerFeeds(definedPropertiesFeed)
      app.permissionService.grantFetchFeedContent(adminPrincipal.user, definedPropertiesFeed.id)
      const conn = Sub.for<FeedServiceConnection>()
      conn.fetchAvailableTopics().resolves([{ id: definedPropertiesFeed.topic } as FeedTopic])
      conn.fetchTopicContent(Arg.all()).resolves(extraPropertiesContent)
      serviceType.createConnection(Arg.all()).resolves(conn)
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, { feed: definedPropertiesFeed.id })
      const res = await app.fetchFeedContent(req)
      const content = res.success!
      const featureProperties = content.items.features.map(x => x.properties)

      expect(featureProperties).to.deep.equal([
        _.omit(extraPropertiesContent.items.features[0].properties, 'wut'),
        _.omit(extraPropertiesContent.items.features[1].properties, 'wait')
      ])
    })

    it('catches errors fetching topics from the feed service', async function() {

      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().throws(new Error('fiddlesticks'))
      conn.fetchTopicContent(Arg.any(), Arg.any()).resolves({
        topic: feed.topic,
        items: { type: 'FeatureCollection', features: [] }
      })
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, { feed: feed.id })
      const res = await app.fetchFeedContent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrInfrastructure)
    })

    it('catches rejections fetching topics from the feed service', async function() {

      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().rejects(new Error('hog spit'))
      conn.fetchTopicContent(Arg.any(), Arg.any()).resolves({
        topic: feed.topic,
        items: { type: 'FeatureCollection', features: [] }
      })
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, { feed: feed.id })
      const res = await app.fetchFeedContent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrInfrastructure)
    })

    it('catches errors fetching content from the feed service', async function() {

      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().resolves([
        { id: feed.topic } as FeedTopic
      ])
      conn.fetchTopicContent(Arg.any(), Arg.any()).throws(new Error('jimmy-jacked'))
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, { feed: feed.id })
      const res = await app.fetchFeedContent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrInfrastructure)
    })

    it('catches rejections fetching content from the feed service', async function() {

      const conn = Sub.for<FeedServiceConnection>()
      serviceType.createConnection(Arg.deepEquals(service.config), Arg.any()).resolves(conn)
      conn.fetchAvailableTopics().resolves([
        { id: feed.topic } as FeedTopic
      ])
      conn.fetchTopicContent(Arg.any(), Arg.any()).rejects(new Error('bacon bits'))
      const req: FetchFeedContentRequest = requestBy(adminPrincipal, { feed: feed.id })
      const res = await app.fetchFeedContent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrInfrastructure)
    })
  })
})

class TestApp {

  readonly serviceTypeRepo = new TestFeedServiceTypeRepository()
  readonly serviceRepo = new TestFeedServiceRepository()
  readonly feedRepo = new TestFeedRepository()
  readonly permissionService = new TestPermissionService()
  readonly jsonSchemaService = Sub.for<JsonSchemaService>()
  readonly eventRepo = Sub.for<MageEventRepository>()
  readonly iconRepo = Sub.for<StaticIconRepository>()

  readonly listServiceTypes = ListFeedServiceTypes(this.permissionService, this.serviceTypeRepo)
  readonly previewTopics = PreviewTopics(this.permissionService, this.serviceTypeRepo)
  readonly createService = CreateFeedService(this.permissionService, this.serviceTypeRepo, this.serviceRepo)
  readonly listServices = ListFeedServices(this.permissionService, this.serviceTypeRepo, this.serviceRepo)
  readonly getService = GetFeedService(this.permissionService, this.serviceTypeRepo, this.serviceRepo)
  readonly deleteService = DeleteFeedService(this.permissionService, this.serviceRepo, this.feedRepo, this.eventRepo)
  readonly listTopics = ListServiceTopics(this.permissionService, this.serviceTypeRepo, this.serviceRepo)
  readonly previewFeed = PreviewFeed(this.permissionService, this.serviceTypeRepo, this.serviceRepo, this.jsonSchemaService, this.iconRepo)
  readonly createFeed = CreateFeed(this.permissionService, this.serviceTypeRepo, this.serviceRepo, this.feedRepo, this.jsonSchemaService, this.iconRepo)
  readonly listFeeds = ListAllFeeds(this.permissionService, this.feedRepo)
  readonly listServiceFeeds = ListServiceFeeds(this.permissionService, this.serviceRepo, this.feedRepo)
  readonly getFeed = GetFeed(this.permissionService, this.serviceTypeRepo, this.serviceRepo, this.feedRepo)
  readonly updateFeed = UpdateFeed(this.permissionService, this.serviceTypeRepo, this.serviceRepo, this.feedRepo, this.iconRepo)
  readonly deleteFeed = DeleteFeed(this.permissionService, this.feedRepo, this.eventRepo)
  readonly fetchFeedContent = FetchFeedContent(this.permissionService, this.serviceTypeRepo, this.serviceRepo, this.feedRepo, this.jsonSchemaService)

  registerServiceTypes(...types: RegisteredFeedServiceType[]): void {
    for (const type of types) {
      this.serviceTypeRepo.db.set(type.id, type)
    }
  }

  registerServices(...services: FeedService[]): void {
    for (const service of services) {
      this.serviceRepo.db.set(service.id, service)
    }
  }

  registerFeeds(...feeds: Feed[]): void {
    for (const feed of feeds) {
      this.feedRepo.db.set(feed.id, feed)
    }
  }
}

class TestFeedServiceTypeRepository implements FeedServiceTypeRepository {

  readonly db = new Map<string, FeedServiceType>()

  async register(moduleName: string, serviceType: FeedServiceType): Promise<RegisteredFeedServiceType> {
    throw new Error('never')
  }

  async findAll(): Promise<FeedServiceType[]> {
    return Array.from(this.db.values())
  }

  async findById(serviceTypeId: string): Promise<FeedServiceType | null> {
    return this.db.get(serviceTypeId) || null
  }
}

class TestFeedServiceRepository implements FeedServiceRepository {

  readonly db = new Map<string, FeedService>()

  async create(attrs: FeedServiceCreateAttrs): Promise<FeedService> {
    const saved: FeedService = {
      id: `${attrs.serviceType as string}:${this.db.size + 1}`,
      ...attrs
    }
    this.db.set(saved.id, saved)
    return saved
  }

  async findAll(): Promise<FeedService[]> {
    return Array.from(this.db.values())
  }

  async findById(sourceId: string): Promise<FeedService | null> {
    return this.db.get(sourceId) || null
  }

  async removeById(serviceId: FeedServiceId): Promise<FeedService | null> {
    const removed = this.db.get(serviceId)
    if (removed) {
      this.db.delete(serviceId)
    }
    return removed || null
  }
}

class TestFeedRepository implements FeedRepository {

  readonly db = new Map<FeedId, Feed>()

  async create(attrs: FeedCreateAttrs): Promise<Feed> {
    const id = uniqid()
    const saved: Feed = { id, ...attrs }
    this.db.set(id, saved)
    return saved
  }

  async findById(feedId: FeedId): Promise<Feed | null> {
    return this.db.get(feedId) || null
  }

  async findAllByIds(feedIds: FeedId[]): Promise<{ [id: string]: Feed | null }> {
    throw new Error('unimplemented')
  }

  async findAll(): Promise<Feed[]> {
    return Array.from(this.db.values())
  }

  async findFeedsForService(service: FeedServiceId): Promise<Feed[]> {
    return Array.from(this.db.values()).filter(x => x.service === service)
  }

  async put(feed: Feed): Promise<Feed | null> {
    const existing = this.db.get(feed.id)
    if (!existing) {
      return null
    }
    if (feed.id !== existing.id) {
      throw new Error('id mismatch')
    }
    if (feed.service !== existing.service) {
      throw new Error('service mismatch')
    }
    if (feed.topic !== existing.topic) {
      throw new Error('topic mismatch')
    }
    const copy = Object.freeze(_.cloneDeep(feed))
    this.db.set(feed.id, copy)
    return copy
  }

  async removeById(feedId: FeedId): Promise<Feed | null> {
    const removed = this.db.get(feedId)
    this.db.delete(feedId)
    if (removed) {
      return removed
    }
    return null
  }

  async removeByServiceId(serviceId: FeedServiceId): Promise<Feed[]> {
    const removed = await this.findFeedsForService(serviceId)
    for (const remove of removed) {
      this.db.delete(remove.id)
    }
    return removed
  }
}
class TestPermissionService implements FeedsPermissionService {

  // TODO: add acl for specific services and listing topics
  readonly privleges = {
    [adminPrincipal.user]: {
      [ListFeedServiceTypes.name]: true,
      [CreateFeedService.name]: true,
      [ListFeedServices.name]: true,
      [ListServiceTopics.name]: true,
      [ListAllFeeds.name]: true,
    }
  } as { [user: string]: { [privilege: string]: boolean } }
  readonly serviceAcls = new Map<FeedServiceId, Map<UserId, Set<string>>>()
  readonly feedAcls = new Map<FeedId, Set<UserId>>()

  async ensureListServiceTypesPermissionFor(context: AppRequestContext<TestPrincipal>): Promise<null | PermissionDeniedError> {
    return this.checkPrivilege(context.requestingPrincipal().user, ListFeedServiceTypes.name)
  }

  async ensureCreateServicePermissionFor(context: AppRequestContext<TestPrincipal>): Promise<null | PermissionDeniedError> {
    return this.checkPrivilege(context.requestingPrincipal().user, CreateFeedService.name)
  }

  async ensureListServicesPermissionFor(context: AppRequestContext<TestPrincipal>): Promise<null | PermissionDeniedError> {
    return this.checkPrivilege(context.requestingPrincipal().user, ListFeedServices.name)
  }

  async ensureListTopicsPermissionFor(context: AppRequestContext<TestPrincipal>, service: FeedServiceId): Promise<null | PermissionDeniedError> {
    return this.ensureServicePrivilege(context, service, ListServiceTopics.name)
  }

  async ensureCreateFeedPermissionFor(context: AppRequestContext<TestPrincipal>, service: FeedServiceId): Promise<null | PermissionDeniedError> {
    return this.ensureServicePrivilege(context, service, CreateFeed.name)
  }

  async ensureListAllFeedsPermissionFor(context: AppRequestContext<TestPrincipal>): Promise<null | PermissionDeniedError> {
    return this.checkPrivilege(context.requestingPrincipal().user, ListAllFeeds.name)
  }

  async ensureFetchFeedContentPermissionFor(context: AppRequestContext<TestPrincipal>, feed: FeedId): Promise<null | PermissionDeniedError> {
    const acl = this.feedAcls.get(feed)
    if (acl?.has(context.requestingPrincipal().user)) {
      return null
    }
    return permissionDenied(FetchFeedContent.name, context.requestingPrincipal().user, feed)
  }

  grantCreateService(user: UserId) {
    this.grantPrivilege(user, CreateFeedService.name)
  }

  grantListServices(user: UserId) {
    this.grantPrivilege(user, ListFeedServices.name)
  }

  grantListTopics(user: UserId, service: FeedServiceId) {
    this.grantServicePrivilege(user, service, ListServiceTopics.name)
  }

  grantCreateFeed(user: UserId, service: FeedServiceId) {
    this.grantServicePrivilege(user, service, CreateFeed.name)
  }

  grantListFeeds(user: UserId) {
    this.grantPrivilege(user, ListAllFeeds.name)
  }

  grantFetchFeedContent(user: UserId, feed: FeedId) {
    const acl = this.feedAcls.get(feed) || new Set<UserId>()
    acl.add(user)
    this.feedAcls.set(feed, acl)
  }

  revokeListTopics(user: UserId, service: FeedServiceId) {
    const acl = this.serviceAcls.get(service)
    const servicePermissions = acl?.get(user)
    servicePermissions?.delete(ListServiceTopics.name)
  }

  revokeListFeeds(user: UserId) {
    this.revokePrivilege(user, ListAllFeeds.name)
  }

  checkPrivilege(user: UserId, privilege: string, object?: string): null | PermissionDeniedError {
    if (!this.privleges[user]?.[privilege]) {
      return permissionDenied(privilege, user, object)
    }
    return null
  }

  grantPrivilege(user: UserId, privilege: string): void {
    const privs = this.privleges[user] || {}
    privs[privilege] = true
    this.privleges[user] = privs
  }

  revokePrivilege(user: UserId, privilege: string): void {
    const privs = this.privleges[user] || {}
    privs[privilege] = false
    this.privleges[user] = privs
  }

  grantServicePrivilege(user: UserId, service: FeedServiceId, privilege: string): void {
    let acl = this.serviceAcls.get(service)
    if (!acl) {
      acl = new Map<UserId, Set<string>>()
      this.serviceAcls.set(service, acl)
    }
    let servicePermissions = acl.get(user)
    if (!servicePermissions) {
      servicePermissions = new Set<string>()
      acl.set(user, servicePermissions)
    }
    servicePermissions.add(privilege)
  }

  ensureServicePrivilege(context: AppRequestContext<TestPrincipal>, service: FeedServiceId, privilege: string): null | PermissionDeniedError {
    const acl = this.serviceAcls.get(service)
    const principal = context.requestingPrincipal()
    if (acl?.get(principal.user)?.has(privilege)) {
      return null
    }
    return permissionDenied(privilege, principal.user, service)
  }
}

function iconUrl(): URL {
  return new URL(`test://icons/${uniqid()}`)
}
