import { RoleBasedStaticIconPermissionService } from '../../lib/permissions/permissions.icons'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { allPermissions, StaticIconPermission } from '../../lib/entities/authorization/entities.permissions'
import { expect } from 'chai'
import { ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'


describe('static icon role-based permission service', function() {

  let permissions: RoleBasedStaticIconPermissionService

  beforeEach(function() {
    permissions = new RoleBasedStaticIconPermissionService()
  })

  it('denies create permission if role does not have write permission', async function() {

    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return {
          username: 'neverever',
          roleId: {
            permissions: [ allPermissions.READ_OBSERVATION_ALL ]
          }
        } as unknown as UserWithRole
      },
      locale() { return null }
    }
    const denied = await permissions.ensureCreateStaticIconPermission(ctx)

    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.subject).to.equal('neverever')
    expect(denied?.data.permission).to.equal(StaticIconPermission.STATIC_ICON_WRITE)
    expect(denied?.data.object).to.be.null
  })

  it('allows create permission if role has write permission', async function() {

    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return {
          username: 'welcome',
          roleId: {
            permissions: [ allPermissions.READ_OBSERVATION_ALL, StaticIconPermission.STATIC_ICON_WRITE ]
          }
        } as unknown as UserWithRole
      },
      locale() { return null }
    }
    const denied = await permissions.ensureCreateStaticIconPermission(ctx)

    expect(denied).to.be.null
  })

  it('allows get permission always', async function() {

    const ctx: AppRequestContext<UserWithRole> = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return {
          username: 'free',
          roleId: {
            permissions: []
          }
        } as unknown as UserWithRole
      },
      locale() { return null }
    }
    const denied = await permissions.ensureGetStaticIconPermission(ctx)

    expect(denied).to.be.null
  })
})