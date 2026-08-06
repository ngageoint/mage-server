import { RoleBasedUserPreferencesPermissionService } from '../../lib/permissions/permissions.users'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { expect } from 'chai'
import { ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'

describe('user preferences role-based permission service', function() {

  let permissions: RoleBasedUserPreferencesPermissionService

  beforeEach(function() {
    permissions = new RoleBasedUserPreferencesPermissionService()
  })

  function contextFor(principal: UserWithRole | null): AppRequestContext<UserWithRole> {
    return {
      requestToken: Symbol(),
      requestingPrincipal: () => principal as UserWithRole,
      locale() { return null }
    }
  }

  describe('getting event preferences', function() {

    it('denies the request if there is no requesting principal', async function() {

      const denied = await permissions.ensureGetEventPreferencePermission(contextFor(null))

      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.subject).to.equal('principal')
      expect(denied?.data.permission).to.equal('UPDATE')
    })

    it('allows the request for any authenticated principal', async function() {

      const denied = await permissions.ensureGetEventPreferencePermission(contextFor({ username: 'user1' } as UserWithRole))

      expect(denied).to.be.null
    })
  })
})
