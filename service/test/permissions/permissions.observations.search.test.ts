import { describe, it } from 'mocha'
import { expect } from 'chai'
import uniqid from 'uniqid'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { EventAccessType, MageEventAttrs } from '../../lib/entities/events/entities.events'
import { SearchIndexPermissionsServiceImpl } from '../../lib/permissions/permissions.observations.search'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { permissionDenied, MageError, ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { MageEventPermission } from '../../lib/entities/authorization/entities.permissions'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'

describe('search index permissions service', function() {

  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let permissions: SearchIndexPermissionsServiceImpl
  let user: UserWithRole
  let context: AppRequestContext<UserWithRole>

  beforeEach(function() {
    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new SearchIndexPermissionsServiceImpl(eventPermissions)
    user = {
      id: uniqid(),
      roleId: {
        id: uniqid(),
        name: 'Role 1',
        permissions: []
      } as any
    } as any
    context = {
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  })

  describe('ensureSearchIndexAllPermission', function() {

    it('grants access when the user role has UPDATE_EVENT permission', async function() {

      user.roleId.permissions = [ MageEventPermission.UPDATE_EVENT ]

      const denied = await permissions.ensureSearchIndexAllPermission(context)

      expect(denied).to.be.null
    })

    it('denies access when the user role does not have UPDATE_EVENT permission', async function() {

      user.roleId.permissions = []

      const denied = await permissions.ensureSearchIndexAllPermission(context)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('ensureSearchIndexEventPermission', function() {

    const event = { id: 1 } as MageEventAttrs

    it('checks update permission on the given event', async function() {

      const expected = permissionDenied(MageEventPermission.UPDATE_EVENT, uniqid())
      eventPermissions.authorizeEventAccess(Arg.is(x => x === event), Arg.any(), MageEventPermission.UPDATE_EVENT, EventAccessType.Update).resolves(expected)

      const denied = await permissions.ensureSearchIndexEventPermission(context, event)

      expect(denied).to.equal(expected)
    })

    it('grants access when the event permission service grants access', async function() {

      eventPermissions.authorizeEventAccess(Arg.is(x => x === event), Arg.any(), MageEventPermission.UPDATE_EVENT, EventAccessType.Update).resolves(null)

      const denied = await permissions.ensureSearchIndexEventPermission(context, event)

      expect(denied).to.be.null
    })
  })
})
