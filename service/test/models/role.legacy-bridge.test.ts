import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongooseRoleRepository, RoleModel } from '../../lib/adapters/roles/adapters.roles.db.mongoose'

describe('role model legacy bridge', function() {

  let roleModule: any
  let roleModel: ReturnType<typeof RoleModel>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    roleModule = require('../../lib/models/role')
    roleModel = RoleModel(mongoose.connection, 'test_role_legacy_bridge')
    roleModule.initialize({ roleRepo: new MongooseRoleRepository(roleModel) })
  })

  afterEach(async function() {
    await roleModel.deleteMany({})
  })

  function createRole(role: { name: string, description?: string, permissions?: string[] }): Promise<any> {
    return new Promise((resolve, reject) => {
      roleModule.createRole(role, (err: any, created: any) => err ? reject(err) : resolve(created))
    })
  }

  it('createRole creates a role and returns it with an id', async function() {
    const role = await createRole({ name: 'BRIDGE_TEST_ROLE', permissions: ['READ_ROLE'] })

    expect(role.id).to.be.a('string')
    expect(role.name).to.equal('BRIDGE_TEST_ROLE')
  })

  it('createRole rejects an invalid permission before touching the repo', async function() {
    let error: any = null
    try {
      await createRole({ name: 'BAD_ROLE', permissions: ['NOT_A_REAL_PERMISSION'] })
    } catch (err) {
      error = err
    }

    expect(error).to.exist
    expect(error.message).to.match(/not a valid permission/)

    const found = await new Promise((resolve, reject) => {
      roleModule.getRole('BAD_ROLE', (err: any, role: any) => err ? reject(err) : resolve(role))
    })
    expect(found).to.be.null
  })

  it('getRoleById, getRole, and getRoles delegate to the repository', async function() {
    const created = await createRole({ name: 'BRIDGE_LOOKUP_ROLE', permissions: [] })

    const byId = await new Promise((resolve, reject) => {
      roleModule.getRoleById(created.id, (err: any, role: any) => err ? reject(err) : resolve(role))
    })
    expect((byId as any).id).to.equal(created.id)

    const byName = await new Promise((resolve, reject) => {
      roleModule.getRole('BRIDGE_LOOKUP_ROLE', (err: any, role: any) => err ? reject(err) : resolve(role))
    })
    expect((byName as any).id).to.equal(created.id)

    const all = await new Promise((resolve, reject) => {
      roleModule.getRoles((err: any, roles: any) => err ? reject(err) : resolve(roles))
    })
    expect((all as any[]).some(r => r.id === created.id)).to.be.true
  })

  it('updateRole updates fields and validates permissions when present', async function() {
    const created = await createRole({ name: 'BRIDGE_UPDATE_ROLE', permissions: ['READ_ROLE'] })

    const updated = await new Promise((resolve, reject) => {
      roleModule.updateRole(created.id, { name: 'BRIDGE_UPDATE_ROLE_RENAMED' }, (err: any, role: any) => err ? reject(err) : resolve(role))
    })
    expect((updated as any).name).to.equal('BRIDGE_UPDATE_ROLE_RENAMED')

    let error: any = null
    try {
      await new Promise((resolve, reject) => {
        roleModule.updateRole(created.id, { permissions: ['BOGUS'] }, (err: any, role: any) => err ? reject(err) : resolve(role))
      })
    } catch (err) {
      error = err
    }
    expect(error).to.exist
  })

  it('deleteRole removes the role', async function() {
    const created = await createRole({ name: 'BRIDGE_DELETE_ROLE', permissions: [] })

    await new Promise((resolve, reject) => {
      roleModule.deleteRole(created, (err: any, role: any) => err ? reject(err) : resolve(role))
    })

    const found = await new Promise((resolve, reject) => {
      roleModule.getRoleById(created.id, (err: any, role: any) => err ? reject(err) : resolve(role))
    })
    expect(found).to.be.null
  })
})

describe('User.removeRoleFromUsers', function() {

  let UserModel: mongoose.Model<any>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    UserModel = require('../../lib/models/user').Model
  })

  afterEach(async function() {
    await UserModel.deleteMany({ username: /^remove-role-from-users-test/ })
  })

  it('clears roleId from users that have the deleted role, fixing the field-name bug', async function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userModule = require('../../lib/models/user')
    const roleId = new mongoose.Types.ObjectId()
    const user = await UserModel.create({
      username: 'remove-role-from-users-test-1',
      displayName: 'Remove Role Test',
      active: true,
      roleId,
      authenticationId: new mongoose.Types.ObjectId()
    })

    await new Promise<void>((resolve, reject) => {
      userModule.removeRoleFromUsers({ id: roleId.toHexString() }, (err: any) => err ? reject(err) : resolve())
    })

    const reloaded = await UserModel.findById(user._id)
    expect(reloaded!.roleId).to.be.undefined
  })

  it('does not affect users with a different roleId', async function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const userModule = require('../../lib/models/user')
    const roleId = new mongoose.Types.ObjectId()
    const otherRoleId = new mongoose.Types.ObjectId()
    const user = await UserModel.create({
      username: 'remove-role-from-users-test-2',
      displayName: 'Remove Role Test',
      active: true,
      roleId: otherRoleId,
      authenticationId: new mongoose.Types.ObjectId()
    })

    await new Promise<void>((resolve, reject) => {
      userModule.removeRoleFromUsers({ id: roleId.toHexString() }, (err: any) => err ? reject(err) : resolve())
    })

    const reloaded = await UserModel.findById(user._id)
    expect(reloaded!.roleId?.toString()).to.equal(otherRoleId.toString())
  })
})
