import { RoleBasedExportsPermissionService } from '../../lib/permissions/permissions.exports'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import { expect } from 'chai'
import { ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'

describe('export role-based permission service', function() {

  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let permissions: RoleBasedExportsPermissionService

  beforeEach(function() {
    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new RoleBasedExportsPermissionService(eventPermissions)
  })

  function contextFor(principal: UserWithRole | null): AppRequestContext<UserWithRole> {
    return {
      requestToken: Symbol(),
      requestingPrincipal: () => principal as UserWithRole,
      locale() { return null }
    }
  }

  it('denies get my exports permission for an anonymous principal', async function() {
    const denied = await permissions.ensureGetMyExportPermission(contextFor(null))

    expect(denied?.code).to.equal(ErrPermissionDenied)
  })

  it('allows get my exports permission for any authenticated user, regardless of role permissions', async function() {
    const user = { username: 'noRolePermissions', roleId: { permissions: [] } } as unknown as UserWithRole
    const denied = await permissions.ensureGetMyExportPermission(contextFor(user))

    expect(denied).to.be.null
  })

  it('denies get my export content permission for an anonymous principal', async function() {
    const denied = await permissions.ensureGetMyExportContentPermission(contextFor(null))

    expect(denied?.code).to.equal(ErrPermissionDenied)
  })

  it('allows get my export content permission for any authenticated user, regardless of role permissions', async function() {
    const user = { username: 'noRolePermissions', roleId: { permissions: [] } } as unknown as UserWithRole
    const denied = await permissions.ensureGetMyExportContentPermission(contextFor(user))

    expect(denied).to.be.null
  })

  it('denies delete my export permission for an anonymous principal', async function() {
    const denied = await permissions.ensureDeleteMyExportPermission(contextFor(null))

    expect(denied?.code).to.equal(ErrPermissionDenied)
  })

  it('allows delete my export permission for any authenticated user, regardless of role permissions', async function() {
    const user = { username: 'noRolePermissions', roleId: { permissions: [] } } as unknown as UserWithRole
    const denied = await permissions.ensureDeleteMyExportPermission(contextFor(user))

    expect(denied).to.be.null
  })
})
