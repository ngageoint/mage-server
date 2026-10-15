import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import * as api from '../../../lib/app.api/preferences/app.api.preferences'
import { GetEventPreferences } from '../../../lib/app.impl/preferences/app.impl.preferences'
import { ErrEntityNotFound, ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors'
import { EventPreference, UserPreferenceRepository } from '../../../lib/entities/users/entities.users'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'
import { AppRequestContext } from '../../../lib/app.api/app.api.global'

function contextFor(principal: string): AppRequestContext<UserWithRole> {
  return {
    requestToken: Symbol(),
    requestingPrincipal: () => ({ id: principal } as unknown as UserWithRole),
    locale() { return null }
  }
}

describe('user preferences use case interactions', function() {

  let userPreferenceRepo: SubstituteOf<UserPreferenceRepository>
  let permissions: SubstituteOf<api.UserPreferencePermissionService>

  beforeEach(function() {
    userPreferenceRepo = Sub.for<UserPreferenceRepository>()
    permissions = Sub.for<api.UserPreferencePermissionService>()
  })

  describe('getting event preferences', function() {

    let getEventPreferences: api.GetEventPreferences

    beforeEach(function() {
      getEventPreferences = GetEventPreferences(userPreferenceRepo, permissions)
    })

    it('denies the request if permission is denied', async function() {

      const context = contextFor('user1')
      permissions.ensureGetEventPreferencePermission(Arg.any()).resolves(permissionDenied('READ', 'user1'))
      const res = await getEventPreferences({ context, eventId: 1 })

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })

    it('returns entity not found if the user has no preferences saved for the event', async function() {

      const context = contextFor('user1')
      permissions.ensureGetEventPreferencePermission(Arg.any()).resolves(null)
      userPreferenceRepo.getEventPreferences('user1', 1).resolves(null)
      const res = await getEventPreferences({ context, eventId: 1 })

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrEntityNotFound)
    })

    it('returns the event preferences for the requesting user', async function() {

      const context = contextFor('user1')
      const eventPreference: EventPreference = { forms: { 1: { fields: { field1: { recentChoices: ['blue'] } } } } }
      permissions.ensureGetEventPreferencePermission(Arg.any()).resolves(null)
      userPreferenceRepo.getEventPreferences('user1', 1).resolves(eventPreference)
      const res = await getEventPreferences({ context, eventId: 1 })

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(eventPreference)
    })
  })
})
