import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseLoginRepository,
  LoginModel,
} from '../../../lib/adapters/logins/adapters.logins.db.mongoose'

describe('MongooseLoginRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection

  before(async function() {
    this.timeout(60000)
    mongo = await MongoMemoryServer.create()
    const uri = mongo.getUri()
    conn = await mongoose.createConnection(uri).asPromise()
    conn.model('User', new mongoose.Schema({ username: String }))
    conn.model('Device', new mongoose.Schema({ uid: String }))
  })

  after(async function() {
    await conn.close()
    await mongo.stop()
  })

  let loginModel: ReturnType<typeof LoginModel>
  let repo: MongooseLoginRepository

  beforeEach(async function() {
    loginModel = LoginModel(conn, 'test_logins')
    await loginModel.init()
    repo = new MongooseLoginRepository(loginModel)
  })

  afterEach(async function() {
    await loginModel.deleteMany({})
  })

  describe('create', function() {
    it('creates a login for a user with no device', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const created = await repo.create({ user: userId })

      expect(created.user).to.equal(userId)
      expect(created.device).to.be.undefined
    })

    it('creates a login for a user and device', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const deviceId = new mongoose.Types.ObjectId().toHexString()
      const created = await repo.create({ user: userId, device: deviceId })

      expect(created.device).to.equal(deviceId)
    })
  })

  describe('findMany', function() {
    it('filters by userId', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const matching = await repo.create({ user: userId })
      await repo.create({ user: new mongoose.Types.ObjectId().toHexString() })
      const found = await repo.findMany({ userId }, {})

      expect(found).to.have.length(1)
      expect(found[0].id).to.equal(matching.id)
    })

    it('defaults to a limit of 10, newest first', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      for (let i = 0; i < 15; i++) {
        await repo.create({ user: userId })
      }
      const found = await repo.findMany({}, {})

      expect(found).to.have.length(10)
    })

    it('paginates with lastLoginId / firstLoginId', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const logins = []
      for (let i = 0; i < 3; i++) {
        logins.push(await repo.create({ user: userId }))
      }
      const page = await repo.findMany({}, { limit: 1, lastLoginId: logins[2].id })

      expect(page).to.have.length(1)
      expect(page[0].id).to.equal(logins[1].id)
    })
  })

  describe('removeManyForUser', function() {
    it('removes only the given user\'s logins', async function() {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const otherUserId = new mongoose.Types.ObjectId().toHexString()
      await repo.create({ user: userId })
      const otherLogin = await repo.create({ user: otherUserId })
      await repo.removeManyForUser(userId)
      const remaining = await repo.findMany({}, {})

      expect(remaining).to.have.length(1)
      expect(remaining[0].id).to.equal(otherLogin.id)
    })
  })
})
