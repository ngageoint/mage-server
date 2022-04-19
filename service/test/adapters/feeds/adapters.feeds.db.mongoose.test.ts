
import mongoose from 'mongoose'
import _ from 'lodash'
import uniqid from 'uniqid'
import { describe, it, before, beforeEach, after, afterEach } from 'mocha'
import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { BaseMongooseRepository } from '../../../lib/adapters/base/adapters.base.db.mongoose'
import { FeedServiceRepository, FeedServiceTypeUnregistered, InvalidServiceConfigError, FeedServiceConnection, FeedServiceInfo, FeedTopic, FeedTopicId, FeedRepository, Feed, FeedServiceCreateAttrs, FeedCreateAttrs } from '../../../lib/entities/feeds/entities.feeds'
import { FeedServiceTypeIdentityModel, FeedsModels, FeedServiceTypeIdentitySchema, FeedServiceModel, FeedServiceSchema, MongooseFeedServiceTypeRepository, MongooseFeedServiceRepository, FeedModel, FeedSchema, MongooseFeedRepository, FeedServiceDocument, FeedDocument } from '../../../lib/adapters/feeds/adapters.feeds.db.mongoose'
import { FeedServiceType } from '../../../lib/entities/feeds/entities.feeds'
import { Json, JsonObject } from '../../../src/entities/entities.json_types'
import { EntityIdFactory } from '../../../lib/entities/entities.global'

describe('feeds repositories', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri, {
      useMongoClient: true,
      promiseLibrary: Promise
    })
  })

  afterEach(async function() {
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  describe('service type repository', function() {

    const collection = 'feed_service_types'
    let model: FeedServiceTypeIdentityModel
    let repo: MongooseFeedServiceTypeRepository

    beforeEach(async function() {
      model = conn.model(FeedsModels.FeedServiceTypeIdentity, FeedServiceTypeIdentitySchema, collection)
      repo = new MongooseFeedServiceTypeRepository(model)
    })

    afterEach(async function() {
      await model.remove({})
    })

    const serviceType: FeedServiceType & {
      topics: FeedTopic[],
      serviceInfo: FeedServiceInfo,
      moduleName: string
    } =
    {
      id: FeedServiceTypeUnregistered,
      pluginServiceTypeId: 'volcanoes',
      title: 'Volcanoes Service Type',
      summary: null,
      configSchema: null,
      async validateServiceConfig(config: Json): Promise<null | InvalidServiceConfigError> {
        return null
      },
      redactServiceConfig(config: Json): Json {
        throw new Error('never')
      },
      async createConnection(config: Json): Promise<FeedServiceConnection> {
        const topics = this.topics
        const serviceInfo = this.serviceInfo
        return {
          async fetchServiceInfo(): Promise<FeedServiceInfo> {
            return serviceInfo
          },
          async fetchAvailableTopics(): Promise<FeedTopic[]> {
            return topics
          },
          async fetchTopicContent(topic: FeedTopicId, params: JsonObject) {
            throw new Error('unimplemented')
          }
        }
      },
      moduleName: '@ngageoint/mage.feeds/volcanoes',
      serviceInfo: {
        title: 'Volcano Hot Spots',
        summary: 'Provide updates on volcano hot spot activity'
      },
      topics: [
        {
          id: 'volcanoes',
          title: 'Volcano Activity',
          paramsSchema: {},
          itemsHaveIdentity: true,
          updateFrequencySeconds: 60 * 60 * 2
        }
      ]
    }

    it('assigns a persistent id to a plugin feed service type', async function() {

      const registered = await repo.register(serviceType.moduleName, serviceType)
      const read = await model.find()

      expect(registered.id).to.be.a('string')
      expect(read.length).to.equal(1)
      expect(read[0]).to.deep.include({
        _id: mongoose.Types.ObjectId(registered.id),
        id: registered.id,
        pluginServiceTypeId: serviceType.pluginServiceTypeId,
        moduleName: serviceType.moduleName
      })
    })

    it('finds all service types', async function() {

      const anotherServiceType: FeedServiceType = {
        id: FeedServiceTypeUnregistered,
        pluginServiceTypeId: 'another_service_type',
        title: 'Another Service Type',
        summary: 'Gotta test multiple service types',
        configSchema: null,
        createConnection() {
          throw new Error('never')
        },
        validateServiceConfig(config: Json) {
          throw new Error('never')
        },
        redactServiceConfig(config: Json) {
          throw new Error('never')
        }
      }
      const registered = await repo.register(serviceType.moduleName, serviceType)
      const anotherRegistered = await repo.register('@org/another_service_type', anotherServiceType)
      const fromRepo = _.keyBy(await repo.findAll(), x => x.id)
      const fromDb = _.keyBy(await model.find(), x => x.id)

      expect(Object.entries(fromRepo).length).to.equal(2)
      expect(fromRepo[registered.id]).to.deep.include(_.omit(serviceType, 'id'))
      expect(fromRepo[anotherRegistered.id]).to.deep.include(_.omit(anotherServiceType, 'id'))
      expect(fromDb[registered.id]).to.deep.include({
        id: registered.id,
        moduleName: serviceType.moduleName,
        pluginServiceTypeId: serviceType.pluginServiceTypeId
      })
      expect(fromDb[anotherRegistered.id]).to.deep.include({
        id: anotherRegistered.id,
        moduleName: '@org/another_service_type',
        pluginServiceTypeId: anotherServiceType.pluginServiceTypeId
      })
    })

    it('retains rich behaviors of persisted service types', async function() {

      const registered = await repo.register(serviceType.moduleName, serviceType)
      const found = await repo.findById(registered.id)
      const conn = await found?.createConnection(null)
      const info = await conn?.fetchServiceInfo()
      const topics = await conn?.fetchAvailableTopics()

      expect(info).to.deep.equal(serviceType.serviceInfo)
      expect(topics).to.deep.equal(serviceType.topics)
    })

    it('registers service types idempotently', async function() {

      const first = await repo.register(serviceType.moduleName, serviceType)
      const second = await repo.register(serviceType.moduleName, serviceType)

      expect(second).to.equal(first)
    })

    it('assigns persistent ids consistently across restarts', async function() {

      const previouslyRegisteredIdentity = await model.create({
        moduleName: serviceType.moduleName,
        pluginServiceTypeId: serviceType.pluginServiceTypeId
      })

      const notYetRegistered = await repo.findById(previouslyRegisteredIdentity.id)

      expect(notYetRegistered).to.be.null

      const registered = await repo.register(serviceType.moduleName, serviceType)
      const found = await repo.findById(previouslyRegisteredIdentity.id)

      expect(registered.id).to.equal(previouslyRegisteredIdentity.id)
      expect(found).to.equal(registered)
    })
  })


  describe('feed service repository', function() {

    const collection = 'test_feed_services'
    let model: FeedServiceModel
    let repo: FeedServiceRepository

    beforeEach(function() {
      model = conn.model(FeedsModels.FeedService, FeedServiceSchema, collection)
      repo = new MongooseFeedServiceRepository(model)
    })

    afterEach(async function() {
      await model.remove({})
    })

    it('does what base repository can do', async function() {
      expect(repo).to.be.instanceOf(BaseMongooseRepository)
    })

    it('returns service type id as string', async function() {
      const stub: FeedServiceCreateAttrs = {
        serviceType: mongoose.Types.ObjectId().toHexString(),
        title: 'No Object IDs',
        summary: 'Testing',
        config: { url: 'https://some.api.com' }
      }
      const created = await repo.create(stub)
      const fetched = await repo.findById(created.id)
      const rawFetched = await model.findOne({ _id: created.id }) as FeedServiceDocument

      expect(rawFetched.serviceType).to.be.instanceOf(mongoose.Types.ObjectId)
      expect(created.serviceType).to.be.a('string')
      expect(fetched?.serviceType).to.be.a('string')
      expect(created.serviceType).to.equal(rawFetched.serviceType.toHexString())
      expect(fetched?.serviceType).to.equal(created.serviceType)
    })

    it('omits version key from json', async function() {

      const stub: FeedServiceCreateAttrs = {
        serviceType: mongoose.Types.ObjectId().toHexString(),
        title: 'No Version Keys',
        summary: 'Testing',
        config: { url: 'https://some.api.com' }
      }
      const created = await repo.create(stub)
      const fetched = await repo.findById(created.id)
      const rawFetched = await model.findOne({ _id: created.id }) as FeedServiceDocument

      expect(created).to.not.have.property('__v')
      expect(fetched).to.not.have.property('__v')
      expect(rawFetched).to.have.property('__v')
    })
  })

  describe('feed repository', function() {

    const collection = 'test_feeds'
    let model: FeedModel
    let repo: FeedRepository
    let idFactory: SubstituteOf<EntityIdFactory>

    beforeEach(function() {
      model = conn.model(FeedsModels.Feed, FeedSchema, collection)
      idFactory = Sub.for<EntityIdFactory>()
      repo = new MongooseFeedRepository(model, idFactory)
    })

    afterEach(async function() {
      await model.remove({})
    })

    describe('creating a feed', function() {

      it('saves the feed', async function() {

        const nextId = `feed:test:${Date.now()}`
        idFactory.nextId().resolves(nextId)
        const createAttrs: Required<FeedCreateAttrs> = Object.freeze({
          id: 'not this one',
          service: mongoose.Types.ObjectId().toHexString(),
          topic: uniqid(),
          title: uniqid(),
          summary: 'everything is required',
          icon: { id: uniqid() },
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          updateFrequencySeconds: 60,
          itemPrimaryProperty: 'great',
          itemSecondaryProperty: 'meh',
          itemTemporalProperty: 'timestamp',
          constantParams: {
            testCoverage: 0.999
          },
          variableParamsSchema: {
            type: 'object',
            properties: {
              newerThanSeconds: { type: 'number' }
            }
          },
          mapStyle: {
            stroke: 'aabbcc',
            strokeWidth: 1,
            fill: 'abc123',
            fillOpacity: 0.5,
            icon: { id: uniqid() }
          },
          itemPropertiesSchema: {
            title: 'Save Me',
            type: 'object'
          },
          localization: {
            'x-test': { title: 'Test Title' }
          }
        })
        const expectedFeed: Omit<Feed, 'id'> = _.omit(createAttrs, 'id')
        const created = await repo.create({ ...createAttrs })
        const fetched = await model.findById(nextId)

        expect(created.id).to.equal(nextId)
        expect(fetched).to.not.be.null
        expect(created).to.deep.include(Object.assign({ ...expectedFeed }, { id: nextId }))
        expect(created).to.deep.equal(fetched?.toJSON())
        idFactory.received(1).nextId()
      })
    })

    describe('updating a feed', function() {

      describe('applying put semantics', async function() {

        it('replaces properties', async function() {

          const origAttrs: Required<FeedCreateAttrs> = Object.freeze({
            id: uniqid(),
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: uniqid(),
            summary: uniqid(),
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            itemPrimaryProperty: uniqid(),
            itemSecondaryProperty: uniqid(),
            itemTemporalProperty: uniqid(),
            itemPropertiesSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              }
            },
            icon: { id: uniqid() },
            mapStyle: {
              stroke: uniqid()
            },
            updateFrequencySeconds: 60,
            constantParams: { [uniqid()]: true },
            variableParamsSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              },
            },
            localization: {
              'x-derp': {
                title: 'Title in Derp'
              }
            }
          })
          const updatedAttrs: Required<Feed> = Object.freeze({
            id: origAttrs.id,
            service: origAttrs.service,
            topic: origAttrs.topic,
            title: uniqid(),
            summary: uniqid(),
            itemsHaveIdentity: !origAttrs.itemsHaveIdentity,
            itemsHaveSpatialDimension: !origAttrs.itemsHaveSpatialDimension,
            itemPrimaryProperty: uniqid(),
            itemSecondaryProperty: uniqid(),
            itemTemporalProperty: uniqid(),
            itemPropertiesSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              }
            },
            icon: { id: uniqid() },
            mapStyle: {
              stroke: uniqid()
            },
            updateFrequencySeconds: origAttrs.updateFrequencySeconds + 10,
            constantParams: { [uniqid()]: true },
            variableParamsSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              }
            },
            localization: {
              'x-derp-ner': { title: 'Title in Derp Ner' }
            }
          })
          const origDoc: FeedDocument = await model.create({ _id: origAttrs.id, ...origAttrs, icon: origAttrs.icon.id })
          const updated = await repo.put(updatedAttrs)
          const updatedDoc = await model.findById(origAttrs.id)

          expect(origDoc.toJSON()).to.deep.equal(origAttrs)
          expect(updated).to.deep.equal(updatedAttrs)
          expect(updatedDoc?.toJSON()).to.deep.equal(updatedAttrs)
        })

        it('removes keys omitted from update', async function() {

          const origAttrs: Required<FeedCreateAttrs> = Object.freeze({
            id: uniqid(),
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: uniqid(),
            summary: uniqid(),
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            itemPrimaryProperty: uniqid(),
            itemSecondaryProperty: uniqid(),
            itemTemporalProperty: uniqid(),
            itemPropertiesSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              }
            },
            icon: { id: uniqid() },
            mapStyle: {
              stroke: uniqid()
            },
            updateFrequencySeconds: 60,
            constantParams: { [uniqid()]: true },
            variableParamsSchema: {
              properties: {
                [uniqid()]: { type: 'string' }
              }
            },
            localization: {
              'x-hurr': { summary: 'Summary in hurr' }
            }
          })
          const updatedAttrs: Feed = Object.freeze({
            id: origAttrs.id,
            service: origAttrs.service,
            topic: origAttrs.topic,
            title: uniqid(),
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
          const origDoc = await model.create({ ...origAttrs, _id: origAttrs.id, icon: origAttrs.icon.id })
          const updated = await repo.put(updatedAttrs)
          const updatedDoc = await model.findById(origDoc.id)

          expect(origDoc.toJSON()).to.deep.equal(origAttrs)
          expect(updated).to.deep.equal(updatedAttrs)
          expect(updatedDoc?.toJSON()).to.deep.equal(updated)
        })

        it('cannot modify service and topic', async function() {

          const origAttrs: Feed = Object.freeze({
            id: uniqid(),
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: uniqid(),
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
          const updatedAttrs: Feed = Object.freeze({
            id: origAttrs.id,
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: uniqid(),
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
          const origDoc = await model.create({ ...origAttrs, _id: origAttrs.id })
          const updated = await repo.put(updatedAttrs)
          const updatedDoc = await model.findById(origAttrs.id)

          expect(origDoc.toJSON()).to.deep.equal(origAttrs)
          expect(updated).to.not.deep.equal(updatedAttrs)
          expect(updated).to.deep.equal({ ...updatedAttrs, service: origAttrs.service, topic: origAttrs.topic })
          expect(updatedDoc?.service.toHexString()).to.equal(origAttrs.service)
          expect(updatedDoc?.topic).to.equal(origAttrs.topic)
          expect(updatedDoc?.toJSON()).to.deep.equal({ ...updatedAttrs, service: origAttrs.service, topic: origAttrs.topic })
        })
      })
    })

    describe('finding all feeds', function() {

      it('returns all the feeds', async function() {

        const feedStubs: FeedCreateAttrs[] = [
          {
            id: '1',
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Feed 1',
            constantParams: {
              limit: 20
            },
            itemsHaveIdentity: false,
            itemsHaveSpatialDimension: false,
          },
          {
            id: '2',
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Feed 2',
            summary: 'The second one',
            constantParams: {
              limit: 7
            },
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true,
            itemPrimaryProperty: 'crucialStuff',
            itemSecondaryProperty: 'details',
            itemTemporalProperty: 'when',
            updateFrequencySeconds: 3600,
            variableParamsSchema: {
              type: 'object',
              properties: {
                newerThanHours: { type: 'number' }
              }
            }
          }
        ]
        const createdDocs = await Promise.all(feedStubs.map(x => model.create(Object.assign({ ...x }, { _id: x.id }))))
        const createdEntities = createdDocs.map(x => x.toJSON())
        const fetched = _.sortBy(await repo.findAll(), [ 'id' ])

        expect(createdEntities).to.have.deep.members(feedStubs)
        expect(fetched).to.have.deep.members(feedStubs)
        expect(fetched).to.have.deep.members(createdEntities)
      })
    })

    describe('finding feeds for ids', function() {

      it('returns all the feeds for the given ids', async function() {

        const feeds: Feed[] = []
        idFactory.nextId().resolves('0', '1', '2')
        feeds.push(await repo.create({
          service: mongoose.Types.ObjectId().toHexString(),
          topic: 'topic0',
          title: 'Feed 0',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        }))
        feeds.push(await repo.create({
          service: mongoose.Types.ObjectId().toHexString(),
          topic: 'topic1',
          title: 'Feed 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        }))
        feeds.push(await repo.create({
          service: mongoose.Types.ObjectId().toHexString(),
          topic: 'topic2',
          title: 'Feed 2',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        }))
        const fetched = await repo.findAllByIds([ '0', '2' ])

        expect(fetched).to.deep.equal({
          '0': feeds[0],
          '2': feeds[2],
        })
      })

      it('returns feed with object ids as strings', async function() {

        const stub: FeedCreateAttrs = {
          service: mongoose.Types.ObjectId().toHexString(),
          topic: uniqid(),
          title: 'No Object IDs',
          summary: 'Testing',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        }
        const created = await repo.create(stub)
        const fetched = await repo.findById(created.id)
        const rawFetched = await model.findOne({ _id: created.id }) as FeedDocument

        expect(rawFetched.service).to.be.instanceOf(mongoose.Types.ObjectId)
        expect(created.service).to.be.a('string')
        expect(fetched?.service).to.be.a('string')
        expect(created.service).to.equal(rawFetched.service.toHexString())
        expect(fetched?.service).to.equal(created.service)
      })

      it('omits version key from json', async function() {

        const stub: FeedCreateAttrs = {
          service: mongoose.Types.ObjectId().toHexString(),
          topic: uniqid(),
          title: 'No Version Keys',
          summary: 'Testing',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        }
        const created = await repo.create(stub)
        const fetched = await repo.findById(created.id)
        const rawFetched = await model.findOne({ _id: created.id }) as FeedDocument

        expect(created).to.not.have.property('__v')
        expect(fetched).to.not.have.property('__v')
        expect(rawFetched).to.have.property('__v')
      })
    })

    describe('finding feeds that reference a service', async function() {

      beforeEach(function() {
        idFactory.nextId().mimicks(async () => uniqid())
      })

      it('finds the feeds with a service id', async function() {

        const service = mongoose.Types.ObjectId().toHexString()
        const serviceFeeds: Feed[] = await Promise.all([
          repo.create({
            service,
            topic: uniqid(),
            title: 'Feed 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service,
            topic: uniqid(),
            title: 'Feed 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service,
            topic: uniqid(),
            title: 'Feed 3',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const otherFeeds: Feed[] = await Promise.all([
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const found = await repo.findFeedsForService(service)
        const all = await repo.findAll()

        expect(found).to.have.length(3)
        expect(found).to.have.deep.members(serviceFeeds)
        expect(found).not.to.have.deep.members(otherFeeds)
        expect(all).to.have.deep.members([ ...otherFeeds, ...serviceFeeds ])
      })

      it('returns an empty list when no feeds reference the service', async function() {

        const otherFeeds: Feed[] = await Promise.all([
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const all = await repo.findAll()
        const found = await repo.findFeedsForService(mongoose.Types.ObjectId().toHexString())

        expect(all).to.have.deep.members(otherFeeds)
        expect(found).to.deep.equal([])
      })
    })

    describe('removing a feed by id', function() {

      it('removes the feed for the id', async function() {

        const stub: FeedCreateAttrs = Object.freeze({
          service: mongoose.Types.ObjectId().toHexString(),
          topic: uniqid(),
          title: 'No Version Keys',
          summary: 'Testing',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true
        })
        idFactory.nextId().resolves('remove_test')
        const created = await repo.create({ ...stub })
        let fetched = await model.findById(created.id)

        expect(created).to.deep.include(stub)
        expect(fetched?.toJSON()).to.deep.equal(created)

        const removed = await repo.removeById(created.id)
        fetched = await model.findById(created.id)
        expect(fetched).to.be.null
        expect(removed).to.deep.equal(created)
      })
    })

    describe('removing feeds by service id', async function() {

      beforeEach(function() {
        idFactory.nextId().mimicks(async () => uniqid())
      })

      it('removes only the feeds that reference the service id and returns them', async function() {

        const service = mongoose.Types.ObjectId().toHexString()
        const serviceFeeds: Feed[] = await Promise.all([
          repo.create({
            service,
            topic: uniqid(),
            title: 'Feed 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service,
            topic: uniqid(),
            title: 'Feed 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const otherFeeds: Feed[] = await Promise.all([
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const allBeforeRemove = await repo.findAll()
        const removed = await repo.removeByServiceId(service)
        const allAfterRemove = await repo.findAll()

        expect(allBeforeRemove).to.have.deep.members([ ...serviceFeeds, ...otherFeeds ])
        expect(removed).to.have.length(2)
        expect(removed).to.have.deep.members(serviceFeeds)
        expect(allAfterRemove).to.have.deep.members(otherFeeds)
      })

      it('removes nothing when no feeds reference the service', async function() {

        const otherFeeds: Feed[] = await Promise.all([
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 1',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          }),
          repo.create({
            service: mongoose.Types.ObjectId().toHexString(),
            topic: uniqid(),
            title: 'Other 2',
            itemsHaveIdentity: true,
            itemsHaveSpatialDimension: true
          })
        ])
        const removed = await repo.removeByServiceId(mongoose.Types.ObjectId().toHexString())
        const allAfterRemove = await repo.findAll()

        expect(removed).to.deep.equal([])
        expect(allAfterRemove).to.have.deep.members(otherFeeds)
      })
    })
  })
})
