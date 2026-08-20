import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import {
  RecentUserLocationsDocument,
  RecentUserLocationsModel,
  MongooseRecentUserLocationsRepository
} from '../../../lib/adapters/locations/adapters.locations.recent.db.mongoose'
import { UserLocation } from '../../../lib/entities/locations/entities.locations'

describe('recent user locations mongoose repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection
  let userModel: mongoose.Model<any>
  let recentModel: mongoose.Model<RecentUserLocationsDocument>
  let recentRepo: MongooseRecentUserLocationsRepository

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri).asPromise()
    userModel = conn.model('User', new mongoose.Schema({
      displayName: { type: String }
    }))
    recentModel = RecentUserLocationsModel(conn, 'test_recent_locations')
    recentRepo = new MongooseRecentUserLocationsRepository(recentModel)
  })

  afterEach(async function() {
    await recentModel.deleteMany({})
    await userModel.deleteMany({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  const eventId = 100

  function location(timestamp: Date, userId: string): UserLocation {
    return {
      type: 'Feature',
      eventId,
      userId,
      teamIds: [],
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { timestamp }
    }
  }

  describe('addLocations', function() {

    it('creates a recent locations document for a new user', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const result = await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])

      expect(result.userId).to.equal(userId)
      expect(result.eventId).to.equal(eventId)
      expect(result.locations).to.have.length(1)
    })

    it('appends to an existing document, sorted by timestamp', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date('2024-01-02T00:00:00.000Z'), userId)])
      const result = await recentRepo.addLocations(userId, eventId, [location(new Date('2024-01-01T00:00:00.000Z'), userId)])

      expect(result.locations).to.have.length(2)
      const timestamps = result.locations.map(l => new Date(l.properties.timestamp).toISOString())
      expect(timestamps).to.deep.equal(['2024-01-02T00:00:00.000Z', '2024-01-01T00:00:00.000Z'])
    })

    it('caps stored locations at the recent locations limit, keeping the most recent', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const base = new Date('2024-01-01T00:00:00.000Z').getTime()
      const locations = Array.from({ length: 105 }, (_, i) => location(new Date(base + i * 1000), userId))

      const result = await recentRepo.addLocations(userId, eventId, locations)

      expect(result.locations).to.have.length(100)
      const timestamps = result.locations.map(l => new Date(l.properties.timestamp).getTime())
      expect(timestamps[0]).to.equal(base + 104 * 1000)
      expect(timestamps[timestamps.length - 1]).to.equal(base + 5 * 1000)
    })
  })

  describe('findLocations', function() {

    it('finds recent locations for an event', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])

      const results = await recentRepo.findLocations({ filter: { eventId } })

      expect(results).to.have.length(1)
      expect(results[0].userId).to.equal(userId)
    })

    it('populates the user when requested', async function() {
      const user = await userModel.create({ displayName: 'Test User' })
      const userId = user._id.toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])

      const results = await recentRepo.findLocations({ filter: { eventId }, populate: true })

      expect(results[0].user).to.exist
      expect(results[0].user.displayName).to.equal('Test User')
    })

    it('does not populate the user unless requested', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])

      const results = await recentRepo.findLocations({ filter: { eventId } })

      expect(results[0].user).to.equal(undefined)
    })

    it('excludes documents for other events', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])
      await recentRepo.addLocations(userId, eventId + 1, [location(new Date(), userId)])

      const results = await recentRepo.findLocations({ filter: { eventId } })

      expect(results).to.have.length(1)
      expect(results[0].eventId).to.equal(eventId)
    })

    it('returns documents for all users in the event', async function() {
      const userIdA = new mongoose.Types.ObjectId().toHexString()
      const userIdB = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userIdA, eventId, [location(new Date(), userIdA)])
      await recentRepo.addLocations(userIdB, eventId, [location(new Date(), userIdB)])

      const results = await recentRepo.findLocations({ filter: { eventId } })

      expect(results.map(r => r.userId).sort()).to.deep.equal([userIdA, userIdB].sort())
    })

    it('limits the number of locations returned per document', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const base = new Date('2024-01-01T00:00:00.000Z').getTime()
      const locations = Array.from({ length: 10 }, (_, i) => location(new Date(base + i * 1000), userId))
      await recentRepo.addLocations(userId, eventId, locations)

      const results = await recentRepo.findLocations({ filter: { eventId }, limit: 3 })

      expect(results[0].locations).to.have.length(3)
      const timestamps = results[0].locations.map(l => new Date(l.properties.timestamp).getTime())
      expect(timestamps).to.deep.equal([base + 9000, base + 8000, base + 7000])
    })

    it('clamps a limit above the recent locations cap', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const base = new Date('2024-01-01T00:00:00.000Z').getTime()
      const locations = Array.from({ length: 105 }, (_, i) => location(new Date(base + i * 1000), userId))
      await recentRepo.addLocations(userId, eventId, locations)

      const results = await recentRepo.findLocations({ filter: { eventId }, limit: 500 })

      expect(results[0].locations).to.have.length(100)
    })

    it('only returns documents with at least one location on or after startDate', async function() {
      const withinRange = new mongoose.Types.ObjectId().toHexString()
      const beforeRange = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(withinRange, eventId, [location(new Date('2024-01-15T00:00:00.000Z'), withinRange)])
      await recentRepo.addLocations(beforeRange, eventId, [location(new Date('2024-01-01T00:00:00.000Z'), beforeRange)])

      const results = await recentRepo.findLocations({
        filter: { eventId, startDate: new Date('2024-01-10T00:00:00.000Z') }
      })

      expect(results.map(r => r.userId)).to.deep.equal([withinRange])
    })

    it('only returns documents with at least one location before endDate', async function() {
      const withinRange = new mongoose.Types.ObjectId().toHexString()
      const afterRange = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(withinRange, eventId, [location(new Date('2024-01-01T00:00:00.000Z'), withinRange)])
      await recentRepo.addLocations(afterRange, eventId, [location(new Date('2024-01-20T00:00:00.000Z'), afterRange)])

      const results = await recentRepo.findLocations({
        filter: { eventId, endDate: new Date('2024-01-10T00:00:00.000Z') }
      })

      expect(results.map(r => r.userId)).to.deep.equal([withinRange])
    })
  })

  describe('removeLocationsForUser', function() {

    it('removes the recent locations document for the user', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      await recentRepo.addLocations(userId, eventId, [location(new Date(), userId)])

      await recentRepo.removeLocationsForUser(userId)

      const count = await recentModel.countDocuments({ userId })
      expect(count).to.equal(0)
    })
  })
})
