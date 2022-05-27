import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { ObservationPermissionsServiceImpl } from '../../lib/permissions/permissions.observations'
import { ObservationRequestContext } from '../../lib/app.api/observations/app.api.observations'
import { MageEvent } from '../../lib/entities/events/entities.events'
import { EventScopedObservationRepository } from '../../lib/entities/observations/entities.observations'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import mongoose from 'mongoose'
import { expect } from 'chai'
import { ObservationPermission } from '../../lib/entities/authorization/entities.permissions'
import { ErrPermissionDenied, MageError, PermissionDeniedError } from '../../lib/app.api/app.api.errors'

describe.only('observation permissions service', function() {

  let permissions: ObservationPermissionsServiceImpl
  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let mageEvent: MageEvent
  let obsRepo: SubstituteOf<EventScopedObservationRepository>
  let user: UserWithRole
  let context: ObservationRequestContext<UserWithRole>

  beforeEach(function() {

    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new ObservationPermissionsServiceImpl(eventPermissions)
    mageEvent = new MageEvent({
      id: 357,
      name: 'Obsevation Permissions Tests',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
    obsRepo = Sub.for<EventScopedObservationRepository>()
    const userId = mongoose.Types.ObjectId()
    user = {
      id: 'user1',
      roleId: {
        id: 'role1',
        name: 'Role 1',
        permissions: []
      } as any
    } as any
    context = {
      mageEvent,
      observationRepository: obsRepo,
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  })

  describe('create permission', function() {

    it('grants when the user role has create permission and the user is a participant of the event', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
      const denied = await permissions.ensureCreateObservationPermission(context)

      expect(denied).to.be.null
    })

    it('denies when the context user is not an event participant', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(false)
      user.roleId.permissions = [ ObservationPermission.CREATE_OBSERVATION ]
      const denied = await permissions.ensureCreateObservationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })

    it('denies when the context user role does not include create permission', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL, ObservationPermission.UPDATE_OBSERVATION_EVENT ]
      const denied = await permissions.ensureCreateObservationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('update permission', function() {

    it('grants when')
    it('denies when')
  })
})