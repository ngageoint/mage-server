import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseUserLocationRepository,
  UserLocationModel,
} from '../../../lib/adapters/locations/adapters.locations.db.mongoose'
import { UserLocation } from '../../../lib/entities/locations/entities.locations'

const eventId = 1

function createLocation(userId: mongoose.Types.ObjectId, timestamp: Date, overrides?: Partial<UserLocation>): UserLocation {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10, 20] },
    userId: userId.toHexString(),
    eventId,
    properties: {
      timestamp,
      accuracy: 5,
    },
    ...overrides,
  }
}

describe('MongooseUserLocationRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection

  before(async function() {
    mongo = await MongoMemoryServer.create()
    const uri = mongo.getUri()
    conn = await mongoose.createConnection(uri).asPromise()
  })

  after(async function() {
    await conn.close()
    await mongo.stop()
  })

  let locationModel: ReturnType<typeof UserLocationModel>
  let repo: MongooseUserLocationRepository

  beforeEach(function() {
    locationModel = UserLocationModel(conn, 'test_locations')
    repo = new MongooseUserLocationRepository(locationModel)
  })

  afterEach(async function() {
    await locationModel.deleteMany({})
  })

  describe('save', function() {

    it('saves an array of user locations', async function() {
      const userId = new mongoose.Types.ObjectId()
      const deviceId = new mongoose.Types.ObjectId()
      const now = new Date()
      const locs = [
        createLocation(userId, now, { properties: { timestamp: now, deviceId: deviceId.toHexString() } }),
        createLocation(userId, new Date(now.getTime() + 1000)),
      ]
      const saved = await repo.save(locs)
      expect(saved).to.be.an('array').with.length(2)
      expect(saved[0].userId).to.equal(userId.toHexString())
      expect(saved[0].eventId).to.equal(eventId)
      expect(saved[0].type).to.equal('Feature')
      expect(saved[0].geometry).to.deep.equal({ type: 'Point', coordinates: [10, 20] })
      expect(saved[0].properties.timestamp).to.deep.equal(now)
      expect(saved[0].properties.deviceId).to.equal(deviceId.toHexString())
    })
  })

  describe('getUserLocations', function() {

    const user1Id = new mongoose.Types.ObjectId()
    const user2Id = new mongoose.Types.ObjectId()
    const t0 = new Date('2024-01-01T00:00:00Z')
    const t1 = new Date('2024-01-01T01:00:00Z')
    const t2 = new Date('2024-01-01T02:00:00Z')
    const t3 = new Date('2024-01-01T03:00:00Z')

    beforeEach(async function() {
      await repo.save([
        createLocation(user1Id, t0),
        createLocation(user1Id, t1),
        createLocation(user2Id, t2),
        createLocation(user2Id, t3),
      ])
    })

    it('returns all locations for an event', async function() {
      const result = await repo.getUserLocations({ where: { eventId } })
      expect(result.items).to.have.length(4)
    })

    it('filters by userIsAnyOf', async function() {
      const result = await repo.getUserLocations({
        where: { eventId, userIsAnyOf: [user1Id.toHexString()] }
      })
      expect(result.items).to.have.length(2)
      expect(result.items.every(l => l.userId === user1Id.toHexString())).to.be.true
    })

    it('filters by timestampAfter (inclusive)', async function() {
      const result = await repo.getUserLocations({
        where: { eventId, timestampAfter: t1 }
      })
      expect(result.items).to.have.length(3)
    })

    it('filters by timestampBefore (exclusive)', async function() {
      const result = await repo.getUserLocations({
        where: { eventId, timestampBefore: t2 }
      })
      expect(result.items).to.have.length(2)
    })

    it('filters by both timestampAfter and timestampBefore', async function() {
      const result = await repo.getUserLocations({
        where: { eventId, timestampAfter: t1, timestampBefore: t3 }
      })
      expect(result.items).to.have.length(2)
      const timestamps = result.items.map(l => l.properties.timestamp.getTime())
      expect(timestamps).to.include(t1.getTime())
      expect(timestamps).to.include(t2.getTime())
    })

    it('returns no locations for a different event', async function() {
      const result = await repo.getUserLocations({ where: { eventId: 999 } })
      expect(result.items).to.have.length(0)
    })

    it('sorts ascending by timestamp by default', async function() {
      const result = await repo.getUserLocations({ where: { eventId } })
      const timestamps = result.items.map(l => l.properties.timestamp.getTime())
      expect(timestamps).to.deep.equal([...timestamps].sort((a, b) => a - b))
    })

    it('sorts descending when order is -1', async function() {
      const result = await repo.getUserLocations({
        where: { eventId },
        orderBy: { field: 'timestamp', order: -1 }
      })
      const timestamps = result.items.map(l => l.properties.timestamp.getTime())
      expect(timestamps).to.deep.equal([...timestamps].sort((a, b) => b - a))
    })

    it('respects paging parameters', async function() {
      const page0 = await repo.getUserLocations({
        where: { eventId },
        paging: { pageIndex: 0, pageSize: 2 }
      })
      expect(page0.items).to.have.length(2)
      expect(page0.totalCount).to.equal(4)
      expect(page0.pageIndex).to.equal(0)

      const page1 = await repo.getUserLocations({
        where: { eventId },
        paging: { pageIndex: 1, pageSize: 2 }
      })
      expect(page1.items).to.have.length(2)
      expect(page1.pageIndex).to.equal(1)

      const allIds = [...page0.items, ...page1.items].map(l => l.properties.timestamp.getTime())
      expect(new Set(allIds).size).to.equal(4)
    })
  })

  describe('iterate', function() {

    const user1Id = new mongoose.Types.ObjectId()
    const user2Id = new mongoose.Types.ObjectId()

    beforeEach(async function() {
      await repo.save([
        createLocation(user1Id, new Date('2024-01-01T00:00:00Z')),
        createLocation(user1Id, new Date('2024-01-01T01:00:00Z')),
        createLocation(user2Id, new Date('2024-01-01T02:00:00Z')),
      ])
    })

    it('iterates all locations for an event', async function() {
      const iterable = repo.iterate({ where: { eventId } })
      const results: UserLocation[] = []
      for await (const loc of iterable) {
        results.push(loc)
      }
      expect(results).to.have.length(3)
    })

    it('filters by userIsAnyOf', async function() {
      const iterable = repo.iterate({ where: { eventId, userIsAnyOf: [user1Id.toHexString()] } })
      const results: UserLocation[] = []
      for await (const loc of iterable) {
        results.push(loc)
      }
      expect(results).to.have.length(2)
      expect(results.every(l => l.userId === user1Id.toHexString())).to.be.true
    })

    it('returns string userId from iterated documents', async function() {
      const iterable = repo.iterate({ where: { eventId } })
      for await (const loc of iterable) {
        expect(loc.userId).to.be.a('string')
      }
    })
  })

  describe('deleteLocationsForUser', function() {

    const user1Id = new mongoose.Types.ObjectId()
    const user2Id = new mongoose.Types.ObjectId()

    beforeEach(async function() {
      await repo.save([
        createLocation(user1Id, new Date()),
        createLocation(user1Id, new Date()),
        createLocation(user2Id, new Date()),
      ])
    })

    it('deletes all locations for the specified user', async function() {
      await repo.deleteLocationsForUser(user1Id.toHexString())
      const remaining = await repo.getUserLocations({ where: { eventId } })
      expect(remaining.items).to.have.length(1)
      expect(remaining.items[0].userId).to.equal(user2Id.toHexString())
    })

    it('does not delete locations for other users', async function() {
      await repo.deleteLocationsForUser(user1Id.toHexString())
      const remaining = await repo.getUserLocations({ where: { eventId } })
      expect(remaining.items.every(l => l.userId === user2Id.toHexString())).to.be.true
    })
  })
})
