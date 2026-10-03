import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseRoleRepository,
  RoleModel,
} from '../../../lib/adapters/roles/adapters.roles.db.mongoose'

describe('MongooseRoleRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection

  before(async function() {
    this.timeout(60000)
    mongo = await MongoMemoryServer.create()
    const uri = mongo.getUri()
    conn = await mongoose.createConnection(uri).asPromise()
  })

  after(async function() {
    await conn.close()
    await mongo.stop()
  })

  let roleModel: ReturnType<typeof RoleModel>
  let repo: MongooseRoleRepository

  beforeEach(function() {
    roleModel = RoleModel(conn, 'test_roles')
    repo = new MongooseRoleRepository(roleModel)
  })

  afterEach(async function() {
    await roleModel.deleteMany({})
  })

  describe('create', function() {

    it('creates and returns a role with an id, not an _id', async function() {
      const created = await repo.create({ name: 'CREATE_ROLE_TEST', description: 'a role', permissions: ['READ_ROLE'] })

      expect(created.id).to.be.a('string')
      expect(created).to.not.have.property('_id')
      expect(created.name).to.equal('CREATE_ROLE_TEST')
      expect(created.description).to.equal('a role')
      expect(created.permissions).to.deep.equal(['READ_ROLE'])
    })

    it('rejects a duplicate name', async function() {
      await repo.create({ name: 'DUPLICATE_ROLE', permissions: [] })

      await expect(repo.create({ name: 'DUPLICATE_ROLE', permissions: [] })).to.be.rejected
    })
  })

  describe('findByName', function() {

    it('finds a role by exact name', async function() {
      await repo.create({ name: 'FIND_BY_NAME_ROLE', permissions: [] })

      const found = await repo.findByName('FIND_BY_NAME_ROLE')

      expect(found?.name).to.equal('FIND_BY_NAME_ROLE')
    })

    it('returns null when no role matches', async function() {
      const found = await repo.findByName('DOES_NOT_EXIST')

      expect(found).to.be.null
    })
  })

  describe('findById / findAll', function() {

    it('finds a role by id', async function() {
      const created = await repo.create({ name: 'FIND_BY_ID_ROLE', permissions: [] })
      const found = await repo.findById(created.id)

      expect(found).to.deep.equal(created)
    })

    it('returns all roles', async function() {
      await repo.create({ name: 'ROLE_A', permissions: [] })
      await repo.create({ name: 'ROLE_B', permissions: [] })

      const all = await repo.findAll()

      expect(all.map(r => r.name)).to.have.members(['ROLE_A', 'ROLE_B'])
    })
  })

  describe('update', function() {

    it('updates and returns the updated role', async function() {
      const created = await repo.create({ name: 'UPDATE_ROLE_TEST', permissions: ['READ_ROLE'] })
      const updated = await repo.update({ id: created.id, name: 'UPDATED_NAME', permissions: ['READ_ROLE', 'UPDATE_ROLE'] })

      expect(updated?.name).to.equal('UPDATED_NAME')
      expect(updated?.permissions).to.deep.equal(['READ_ROLE', 'UPDATE_ROLE'])
    })
  })

  describe('removeById', function() {

    it('deletes the role and returns it', async function() {
      const created = await repo.create({ name: 'REMOVE_ROLE_TEST', permissions: [] })
      const removed = await repo.removeById(created.id)

      expect(removed?.id).to.equal(created.id)
      expect(await repo.findById(created.id)).to.be.null
    })

    it('returns null when the role does not exist', async function() {
      const removed = await repo.removeById(new mongoose.Types.ObjectId().toHexString())

      expect(removed).to.be.null
    })

    it('does not itself touch any other collection', async function() {
      const created = await repo.create({ name: 'NO_SIDE_EFFECTS_ROLE', permissions: [] })
      const userModel = conn.model('User', new mongoose.Schema({ roleId: mongoose.Schema.Types.ObjectId }), 'test_roles_no_side_effect_users')
      const user = await userModel.create({ roleId: new mongoose.Types.ObjectId(created.id) })

      await repo.removeById(created.id)

      const stillReferenced = await userModel.findById(user._id)
      expect(stillReferenced?.roleId?.toString()).to.equal(created.id)
    })
  })
})
