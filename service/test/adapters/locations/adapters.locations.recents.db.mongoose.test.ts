import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseRecentUserLocationsRepository,
  RecentUserLocationModel,
} from '../../../lib/adapters/locations/adapters.locations.recent.db.mongoose'
import { UserLocation } from '../../../lib/entities/locations/entities.locations'
import * as legacyUser from '../../../lib/models/user'

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

describe('MongooseRecentUserLocationsRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection
  let recentModel: ReturnType<typeof RecentUserLocationModel>
  let repo: MongooseRecentUserLocationsRepository
  let UserModel: mongoose.Model<any>

  before(async function() {
    mongo = await MongoMemoryServer.create()
    const uri = mongo.getUri()
    conn = await mongoose.createConnection(uri).asPromise()
    UserModel = conn.model('User', legacyUser.Schema)
  })

  after(async function() {
    await conn.close()
    await mongo.stop()
  })

  beforeEach(function() {
    recentModel = RecentUserLocationModel(conn, 'test_capped_locations')
    repo = new MongooseRecentUserLocationsRepository(recentModel)
  })

  afterEach(async function() {
    await recentModel.deleteMany({})
    await UserModel.deleteMany({})
  })

  describe('addLocations', function() {

    it('creates a new document and returns it with locations', async function() {
      const userId = new mongoose.Types.ObjectId()
      const now = new Date()
      const result = await repo.addLocations({
        userId: userId.toHexString(),
        eventId,
        locations: [createLocation(userId, now)],
      })
      expect(result.userId).to.equal(userId.toHexString())
      expect(result.eventId).to.equal(eventId)
      expect(result.locations).to.have.length(1)
      expect(result.locations[0].properties.timestamp).to.deep.equal(now)
    })

    it('upserts: subsequent calls append to existing document', async function() {
      const userId = new mongoose.Types.ObjectId()
      const t0 = new Date('2024-01-01T00:00:00Z')
      const t1 = new Date('2024-01-01T01:00:00Z')

      await repo.addLocations({
        userId: userId.toHexString(),
        eventId,
        locations: [createLocation(userId, t0)],
      })
      const result = await repo.addLocations({
        userId: userId.toHexString(),
        eventId,
        locations: [createLocation(userId, t1)],
      })

      expect(result.locations).to.have.length(2)
    })

    it('returns locations sorted by timestamp descending (most recent first)', async function() {
      const userId = new mongoose.Types.ObjectId()
      const t0 = new Date('2024-01-01T00:00:00Z')
      const t1 = new Date('2024-01-01T01:00:00Z')
      const t2 = new Date('2024-01-01T02:00:00Z')

      const result = await repo.addLocations({
        userId: userId.toHexString(),
        eventId,
        locations: [
          createLocation(userId, t1),
          createLocation(userId, t0),
          createLocation(userId, t2),
        ],
      })

      const timestamps = result.locations.map(l => l.properties.timestamp.getTime())
      expect(timestamps[0]).to.be.greaterThan(timestamps[1])
      expect(timestamps[1]).to.be.greaterThan(timestamps[2])
    })

    it('coerces userId to string', async function() {
      const userId = new mongoose.Types.ObjectId()
      const result = await repo.addLocations({
        userId: userId.toHexString(),
        eventId,
        locations: [createLocation(userId, new Date())],
      })
      expect(result.userId).to.be.a('string').and.equal(userId.toHexString())
    })
  })

  describe('findLocations', function() {

    const user1Id = new mongoose.Types.ObjectId()
    const user2Id = new mongoose.Types.ObjectId()
    const t0 = new Date('2024-01-01T00:00:00Z')
    const t1 = new Date('2024-01-01T01:00:00Z')
    const t2 = new Date('2024-01-01T02:00:00Z')

    beforeEach(async function() {
      await repo.addLocations({
        userId: user1Id.toHexString(),
        eventId,
        locations: [createLocation(user1Id, t0), createLocation(user1Id, t1)],
      })
      await repo.addLocations({
        userId: user2Id.toHexString(),
        eventId,
        locations: [createLocation(user2Id, t2)],
      })
    })

    it('returns all recent location groups for an event', async function() {
      const results = await repo.findLocations({ where: { eventId } })
      expect(results).to.have.length(2)
    })

    it('returns empty array for unknown event', async function() {
      const results = await repo.findLocations({ where: { eventId: 999 } })
      expect(results).to.have.length(0)
    })

    it('respects limit parameter', async function() {
      const results = await repo.findLocations({ where: { eventId }, limit: 1 })
      expect(results).to.have.length(2)
      results.forEach(r => expect(r.locations).to.have.length(1))
    })

    it('excludes user groups with no locations at or after timestampAfter', async function() {
      // user1 has locations at t0, t1; user2 has location at t2
      // with timestampAfter past t2, only a hypothetical user3 with t3+ would qualify
      const afterAll = new Date(t2.getTime() + 1)
      const results = await repo.findLocations({
        where: { eventId, timestampAfter: afterAll }
      })
      expect(results).to.have.length(0)
    })

    it('excludes user groups with no locations before timestampBefore', async function() {
      // user2 has only t2; timestampBefore: t2 means t2 < t2 is false, so user2 is excluded
      const results = await repo.findLocations({
        where: { eventId, timestampBefore: t2 }
      })
      expect(results).to.have.length(1)
      expect(results[0].userId).to.equal(user1Id.toHexString())
    })

    it('returns string userId without populate', async function() {
      const results = await repo.findLocations({ where: { eventId } })
      results.forEach(r => {
        expect(r.userId).to.be.a('string')
        expect(r.user).to.be.undefined
      })
    })

    it('filters by userIsAnyOf', async function() {
      const results = await repo.findLocations({
        where: { eventId, userIsAnyOf: [ user1Id.toHexString() ] }
      })
      expect(results).to.have.length(1)
      expect(results[0].userId).to.equal(user1Id.toHexString())
    })

    it('returns all matching users when userIsAnyOf has multiple ids', async function() {
      const results = await repo.findLocations({
        where: { eventId, userIsAnyOf: [ user1Id.toHexString(), user2Id.toHexString() ] }
      })
      expect(results.map(r => r.userId).sort()).to.deep.equal(
        [ user1Id.toHexString(), user2Id.toHexString() ].sort()
      )
    })

    it('returns no results when userIsAnyOf does not match any user', async function() {
      const results = await repo.findLocations({
        where: { eventId, userIsAnyOf: [ new mongoose.Types.ObjectId().toHexString() ] }
      })
      expect(results).to.have.length(0)
    })
  })

  describe('findLocations with populate', function() {

    it('maps user fields to plain values', async function() {
      const userDoc = await UserModel.create({
        username: 'populateuser',
        displayName: 'Populate User',
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId(),
        active: true,
        enabled: true,
      })
      await repo.addLocations({
        userId: userDoc._id.toHexString(),
        eventId,
        locations: [createLocation(userDoc._id, new Date())],
      })

      const results = await repo.findLocations({ where: { eventId }, populate: true })

      expect(results).to.have.length(1)
      const { user } = results[0]
      expect(user).to.exist
      expect(user!.id).to.be.a('string').and.equal(userDoc._id.toHexString())
      expect(user!.displayName).to.equal('Populate User')
    })

    it('sets icon when user has an uploaded icon with a relativePath', async function() {
      const userDoc = await UserModel.create({
        username: 'iconuser',
        displayName: 'Icon User',
        icon: { type: 'upload', text: '', color: '', relativePath: 'icons/iconuser.png' },
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId(),
        active: true,
        enabled: true,
      })
      await repo.addLocations({
        userId: userDoc._id.toHexString(),
        eventId,
        locations: [createLocation(userDoc._id, new Date())],
      })

      const results = await repo.findLocations({ where: { eventId }, populate: true })
      const { user } = results[0]
      expect(user!.icon).to.exist
      expect(user!.icon!.relativePath).to.equal('icons/iconuser.png')
    })

    it('icon is a plain object, not a Mongoose document', async function() {
      const userDoc = await UserModel.create({
        username: 'iconplainuser',
        displayName: 'Icon Plain User',
        icon: { type: 'upload', text: '', color: '', relativePath: 'icons/plain.png' },
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId(),
        active: true,
        enabled: true,
      })
      await repo.addLocations({
        userId: userDoc._id.toHexString(),
        eventId,
        locations: [createLocation(userDoc._id, new Date())],
      })

      const results = await repo.findLocations({ where: { eventId }, populate: true })
      expect(results[0].user!.icon).to.not.have.property('toObject')
    })

    it('icon is undefined when user has no icon relativePath', async function() {
      const userDoc = await UserModel.create({
        username: 'noiconuser',
        displayName: 'No Icon User',
        icon: { type: 'none', text: '', color: '' },
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId(),
        active: true,
        enabled: true,
      })
      await repo.addLocations({
        userId: userDoc._id.toHexString(),
        eventId,
        locations: [createLocation(userDoc._id, new Date())],
      })

      const results = await repo.findLocations({ where: { eventId }, populate: true })
      expect(results[0].user!.icon?.relativePath).to.be.undefined
    })

    it('user is undefined when populate is omitted', async function() {
      const userDoc = await UserModel.create({
        username: 'nopopulateuser',
        displayName: 'No Populate User',
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId(),
        active: true,
        enabled: true,
      })
      await repo.addLocations({
        userId: userDoc._id.toHexString(),
        eventId,
        locations: [createLocation(userDoc._id, new Date())],
      })

      const results = await repo.findLocations({ where: { eventId } })
      expect(results[0].user).to.be.undefined
    })
  })

  describe('deleteLocationsForUser', function() {

    const user1Id = new mongoose.Types.ObjectId()
    const user2Id = new mongoose.Types.ObjectId()

    beforeEach(async function() {
      await repo.addLocations({
        userId: user1Id.toHexString(),
        eventId,
        locations: [createLocation(user1Id, new Date())],
      })
      await repo.addLocations({
        userId: user2Id.toHexString(),
        eventId,
        locations: [createLocation(user2Id, new Date())],
      })
    })

    it('deletes recent locations document for the specified user', async function() {
      await repo.deleteLocationsForUser(user1Id.toHexString())
      const remaining = await repo.findLocations({ where: { eventId } })
      expect(remaining).to.have.length(1)
      expect(remaining[0].userId).to.equal(user2Id.toHexString())
    })

    it('does not affect other users', async function() {
      await repo.deleteLocationsForUser(user1Id.toHexString())
      const remaining = await repo.findLocations({ where: { eventId } })
      expect(remaining.every(r => r.userId === user2Id.toHexString())).to.be.true
    })
  })
})
