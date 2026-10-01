import { describe, it } from 'mocha'
import { expect } from 'chai'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { AppResponse } from '../../../lib/app.api/app.api.global'
import { ErrEntityNotFound, ErrInvalidInput, ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors'
import * as api from '../../../lib/app.api/roles/app.api.roles'
import * as impl from '../../../lib/app.impl/roles/app.impl.roles'
import { Role, RoleRepository } from '../../../lib/entities/authorization/entities.authorization'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const principal = { id: 'user1', username: 'testuser' } as unknown as UserWithRole

function createContext(): api.RoleRequestContext {
  return {
    requestToken: Symbol(),
    requestingPrincipal: () => principal,
    locale: () => null,
  }
}

function createRole(overrides?: Partial<Role>): Role {
  return {
    id: 'role1',
    name: 'TEST_ROLE',
    permissions: ['READ_ROLE'],
    ...overrides,
  }
}

describe('roles app layer', function() {

  let permissionService: SubstituteOf<api.RolePermissionService>
  let repo: SubstituteOf<RoleRepository>

  beforeEach(function() {
    permissionService = Sub.for<api.RolePermissionService>()
    repo = Sub.for<RoleRepository>()
  })

  describe('ReadRoles', function() {

    let readRoles: api.ReadRoles

    beforeEach(function() {
      readRoles = impl.ReadRoles(permissionService, repo)
    })

    it('returns permission denied without querying repo', async function() {
      const req: api.ReadRolesRequest = { context: createContext() }
      permissionService.ensureReadRolePermission(Arg.all()).resolves(permissionDenied('READ_ROLE', principal.id))

      const res = await readRoles(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().findAll()
    })

    it('returns all roles on success', async function() {
      const roles = [createRole()]
      const req: api.ReadRolesRequest = { context: createContext() }
      permissionService.ensureReadRolePermission(Arg.all()).resolves(null)
      repo.findAll().resolves(roles)

      const res = await readRoles(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(roles)
    })
  })

  describe('ReadRole', function() {

    let readRole: api.ReadRole

    beforeEach(function() {
      readRole = impl.ReadRole(permissionService, repo)
    })

    it('returns permission denied without querying repo', async function() {
      const req: api.ReadRoleRequest = { context: createContext(), roleId: 'role1' }
      permissionService.ensureReadRolePermission(Arg.all()).resolves(permissionDenied('READ_ROLE', principal.id))

      const res = await readRole(req)

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().findById(Arg.any())
    })

    it('returns entity not found when role does not exist', async function() {
      const req: api.ReadRoleRequest = { context: createContext(), roleId: 'missing' }
      permissionService.ensureReadRolePermission(Arg.all()).resolves(null)
      repo.findById('missing').resolves(null)

      const res = await readRole(req)

      expect(res.error?.code).to.equal(ErrEntityNotFound)
    })

    it('returns the role on success', async function() {
      const role = createRole()
      const req: api.ReadRoleRequest = { context: createContext(), roleId: role.id }
      permissionService.ensureReadRolePermission(Arg.all()).resolves(null)
      repo.findById(role.id).resolves(role)

      const res = await readRole(req)

      expect(res.success).to.deep.equal(role)
    })
  })

  describe('CreateRole', function() {

    let createRoleFn: api.CreateRole

    beforeEach(function() {
      createRoleFn = impl.CreateRole(permissionService, repo)
    })

    it('returns permission denied without creating', async function() {
      const req: api.CreateRoleRequest = {
        context: createContext(),
        role: { name: 'NEW_ROLE', permissions: ['READ_ROLE'] }
      }
      permissionService.ensureCreateRolePermission(Arg.all()).resolves(permissionDenied('CREATE_ROLE', principal.id))

      const res = await createRoleFn(req)

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().create(Arg.any())
    })

    it('rejects invalid permissions without creating', async function() {
      const req: api.CreateRoleRequest = {
        context: createContext(),
        role: { name: 'NEW_ROLE', permissions: ['NOT_A_REAL_PERMISSION'] }
      }
      permissionService.ensureCreateRolePermission(Arg.all()).resolves(null)

      const res = await createRoleFn(req)

      expect(res.error?.code).to.equal(ErrInvalidInput)
      repo.didNotReceive().create(Arg.any())
    })

    it('creates the role when permissions are valid', async function() {
      const created = createRole({ name: 'NEW_ROLE' })
      const req: api.CreateRoleRequest = {
        context: createContext(),
        role: { name: 'NEW_ROLE', permissions: ['READ_ROLE'] }
      }
      permissionService.ensureCreateRolePermission(Arg.all()).resolves(null)
      repo.create(Arg.all()).resolves(created)

      const res = await createRoleFn(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(created)
    })
  })

  describe('UpdateRole', function() {

    let updateRole: api.UpdateRole

    beforeEach(function() {
      updateRole = impl.UpdateRole(permissionService, repo)
    })

    it('returns permission denied without updating', async function() {
      const req: api.UpdateRoleRequest = { context: createContext(), roleId: 'role1', update: { name: 'X' } }
      permissionService.ensureUpdateRolePermission(Arg.all()).resolves(permissionDenied('UPDATE_ROLE', principal.id))

      const res = await updateRole(req)

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().update(Arg.any())
    })

    it('rejects invalid permissions in the update without updating', async function() {
      const req: api.UpdateRoleRequest = { context: createContext(), roleId: 'role1', update: { permissions: ['BOGUS'] } }
      permissionService.ensureUpdateRolePermission(Arg.all()).resolves(null)

      const res = await updateRole(req)

      expect(res.error?.code).to.equal(ErrInvalidInput)
      repo.didNotReceive().update(Arg.any())
    })

    it('does not validate permissions when the update omits them', async function() {
      const existing = createRole()
      const req: api.UpdateRoleRequest = { context: createContext(), roleId: existing.id, update: { name: 'RENAMED' } }
      permissionService.ensureUpdateRolePermission(Arg.all()).resolves(null)
      repo.findById(existing.id).resolves(existing)
      repo.update(Arg.all()).resolves({ ...existing, name: 'RENAMED' })

      const res = await updateRole(req)

      expect(res.error).to.be.null
      expect(res.success?.name).to.equal('RENAMED')
    })

    it('returns entity not found when the role does not exist', async function() {
      const req: api.UpdateRoleRequest = { context: createContext(), roleId: 'missing', update: { name: 'X' } }
      permissionService.ensureUpdateRolePermission(Arg.all()).resolves(null)
      repo.findById('missing').resolves(null)

      const res = await updateRole(req)

      expect(res.error?.code).to.equal(ErrEntityNotFound)
      repo.didNotReceive().update(Arg.any())
    })
  })

  describe('DeleteRole', function() {

    let deleteRole: api.DeleteRole
    let removeRoleFromUsers: impl.RemoveRoleFromUsers
    let removeRoleFromUsersCalls: string[]

    beforeEach(function() {
      removeRoleFromUsersCalls = []
      removeRoleFromUsers = async (roleId: string) => {
        removeRoleFromUsersCalls.push(roleId)
      }
      deleteRole = impl.DeleteRole(permissionService, repo, removeRoleFromUsers)
    })

    it('returns permission denied without touching repo or cascade', async function() {
      const req: api.DeleteRoleRequest = { context: createContext(), roleId: 'role1' }
      permissionService.ensureDeleteRolePermission(Arg.all()).resolves(permissionDenied('DELETE_ROLE', principal.id))

      const res = await deleteRole(req)

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().findById(Arg.any())
      repo.didNotReceive().removeById(Arg.any())
      expect(removeRoleFromUsersCalls).to.deep.equal([])
    })

    it('returns entity not found and does not run the cascade when the role does not exist', async function() {
      const req: api.DeleteRoleRequest = { context: createContext(), roleId: 'missing' }
      permissionService.ensureDeleteRolePermission(Arg.all()).resolves(null)
      repo.findById('missing').resolves(null)

      const res = await deleteRole(req)

      expect(res.error?.code).to.equal(ErrEntityNotFound)
      repo.didNotReceive().removeById(Arg.any())
      expect(removeRoleFromUsersCalls).to.deep.equal([])
    })

    it('removes the role from users before deleting the role', async function() {
      const existing = createRole()
      const req: api.DeleteRoleRequest = { context: createContext(), roleId: existing.id }
      permissionService.ensureDeleteRolePermission(Arg.all()).resolves(null)
      repo.findById(existing.id).resolves(existing)
      repo.removeById(existing.id).resolves(existing)

      const res = await deleteRole(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(existing)
      expect(removeRoleFromUsersCalls).to.deep.equal([existing.id])
    })
  })
})
