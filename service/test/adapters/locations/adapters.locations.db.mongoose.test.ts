import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { UserLocationDocument, UserLocationModel, MongooseUserLocationRepository } from '../../../lib/adapters/locations/adapters.locations.db.mongoose'
import { UserLocationCreateAttrs } from '../../../lib/entities/locations/entities.locations'

describe('locations mongoose repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection
  let locationModel: mongoose.Model<UserLocationDocument>
  let locationRepo: MongooseUserLocationRepository

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri).asPromise()
    locationModel = UserLocationModel(conn, 'test_locations')
    locationRepo = new MongooseUserLocationRepository(locationModel)
  })

  afterEach(async function() {
    await locationModel.deleteMany({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  const userId = new mongoose.Types.ObjectId().toHexString()
  const eventId = 100

  function locationAttrs(timestamp: Date, overrides: Partial<UserLocationCreateAttrs> = {}): UserLocationCreateAttrs {
    return {
      type: 'Feature',
      eventId,
      userId,
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { timestamp },
      ...overrides
    } as UserLocationCreateAttrs
  }

  describe('createLocations', function() {

    it('creates and returns locations', async function() {
      const created = await locationRepo.createLocations([
        locationAttrs(new Date('2024-01-01T00:00:00.000Z')),
        locationAttrs(new Date('2024-01-02T00:00:00.000Z'))
      ])

      expect(created).to.have.length(2)
      expect(created[0].userId).to.equal(userId)
      expect(created[0].eventId).to.equal(eventId)

      const count = await locationModel.countDocuments({})
      expect(count).to.equal(2)
    })
  })

  describe('getLocations', function() {

    beforeEach(async function() {
      await locationRepo.createLocations([
        locationAttrs(new Date('2024-01-01T00:00:00.000Z')),
        locationAttrs(new Date('2024-01-15T00:00:00.000Z')),
        locationAttrs(new Date('2024-02-01T00:00:00.000Z'))
      ])
    })

    async function collect(options: Parameters<MongooseUserLocationRepository['getLocations']>[0]) {
      const results = []
      for await (const location of locationRepo.getLocations(options)) {
        results.push(location)
      }
      return results
    }

    it('filters by eventId', async function() {
      const results = await collect({ filter: { eventId } })
      expect(results).to.have.length(3)
    })

    it('filters by startDate and endDate', async function() {
      const results = await collect({
        filter: {
          eventId,
          startDate: new Date('2024-01-10T00:00:00.000Z'),
          endDate: new Date('2024-01-20T00:00:00.000Z')
        }
      })
      expect(results).to.have.length(1)
      expect(new Date(results[0].properties.timestamp).toISOString()).to.equal('2024-01-15T00:00:00.000Z')
    })

    it('filters by startDate only', async function() {
      const results = await collect({
        filter: { eventId, startDate: new Date('2024-01-10T00:00:00.000Z') }
      })
      expect(results).to.have.length(2)
    })

    it('filters by endDate only', async function() {
      const results = await collect({
        filter: { eventId, endDate: new Date('2024-01-20T00:00:00.000Z') }
      })
      expect(results).to.have.length(2)
    })

    it('filters by userId', async function() {
      const otherUserId = new mongoose.Types.ObjectId().toHexString()
      await locationRepo.createLocations([locationAttrs(new Date('2024-03-01T00:00:00.000Z'), { userId: otherUserId })])

      const results = await collect({ filter: { eventId, userId: otherUserId } })
      expect(results).to.have.length(1)
      expect(results[0].userId).to.equal(otherUserId)
    })

    it('filters by lastLocationId combined with startDate and endDate', async function() {
      const all = await collect({ filter: { eventId } })
      const lastLocationId = String(all[0].id)

      const results = await collect({
        filter: {
          eventId,
          lastLocationId,
          startDate: new Date('2024-01-01T00:00:00.000Z'),
          endDate: new Date('2024-02-15T00:00:00.000Z')
        }
      })

      expect(results.map(r => r.id)).to.not.include(lastLocationId)
      expect(results).to.have.length(2)
    })

    it('sorts using a custom sort option', async function() {
      const results = await collect({ filter: { eventId }, sort: { 'properties.timestamp': -1 } })
      expect(results).to.have.length(3)
      expect(new Date(results[0].properties.timestamp).toISOString()).to.equal('2024-02-01T00:00:00.000Z')
      expect(new Date(results[2].properties.timestamp).toISOString()).to.equal('2024-01-01T00:00:00.000Z')
    })

    it('sorts by timestamp then id by default', async function() {
      const results = await collect({ filter: { eventId } })
      const timestamps = results.map(r => new Date(r.properties.timestamp).getTime())
      expect(timestamps).to.deep.equal([...timestamps].sort((a, b) => a - b))
    })

    it('returns lean results when lean is set', async function() {
      const results = await collect({ filter: { eventId }, lean: true })
      expect(results).to.have.length(3)
    })
  })

  describe('null handling', function() {

    it('maps a null userId through without throwing', async function() {
      const [created] = await locationRepo.createLocations([
        locationAttrs(new Date(), { userId: null as any })
      ])
      expect(created.userId).to.equal(null)

      const results = []
      for await (const location of locationRepo.getLocations({ filter: { eventId } })) {
        results.push(location)
      }
      expect(results.find(r => r.id === created.id)?.userId).to.equal(null)
    })

    it('maps a missing/null deviceId to null', async function() {
      const [created] = await locationRepo.createLocations([locationAttrs(new Date())])
      expect(created.properties.deviceId).to.equal(null)
    })
  })

  describe('removeLocationsForUser', function() {

    it('removes all locations for the user', async function() {
      await locationRepo.createLocations([locationAttrs(new Date())])
      await locationRepo.removeLocationsForUser(userId)

      const count = await locationModel.countDocuments({ userId })
      expect(count).to.equal(0)
    })
  })
})
