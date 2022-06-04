import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { ObservationPermissionsServiceImpl } from '../../lib/permissions/permissions.observations'
import { ObservationRequestContext } from '../../lib/app.api/observations/app.api.observations'
import { EventAccessType, MageEvent } from '../../lib/entities/events/entities.events'
import { EventScopedObservationRepository } from '../../lib/entities/observations/entities.observations'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import { expect } from 'chai'
import { ObservationPermission } from '../../lib/entities/authorization/entities.permissions'
import { ErrPermissionDenied, MageError, PermissionDeniedError } from '../../lib/app.api/app.api.errors'
import uniqid from 'uniqid'

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
    user = {
      id: uniqid(),
      roleId: {
        id: uniqid(),
        name: 'Role 1',
        permissions: []
      } as any
    } as any
    context = {
      mageEvent,
      userId: uniqid(),
      deviceId: uniqid(),
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

    it('grants when the context user role has permission to update all observations regardless of event scope', async function() {

      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_ALL ]
      const denied = await permissions.ensureUpdateObservationPermission(context)

      expect(denied).to.be.null
    })

    it('grants when the context user role has event participant update permission and read access for the context event', async function() {

      user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
      eventPermissions.userHasEventPermission(context.mageEvent, context.requestingPrincipal().id, EventAccessType.Read).resolves(true)
      const denied = await permissions.ensureUpdateObservationPermission(context)

      eventPermissions.received(1).userHasEventPermission(context.mageEvent, context.requestingPrincipal().id, EventAccessType.Read)
    })

    describe('denies', function() {

      const denyTests: [ testName: string, setupContext: () => any ][] = [
        [ 'with empty permissions', () => void(0) ],
        [
          'with participant update permission but without event read access',
          () => {
            user.roleId.permissions = [ ObservationPermission.UPDATE_OBSERVATION_EVENT ]
            eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
          }
        ],
        [
          'with event read access but without participant update permission',
          () => {
            user.roleId.permissions = []
            eventPermissions.userHasEventPermission(Arg.all()).resolves(true)
          }
        ]
      ]
      denyTests.forEach(([ testName, setupContext ]) => {
        it(testName, async function() {
          setupContext()
          const denied = await permissions.ensureUpdateObservationPermission(context)
          expect(denied).to.be.instanceOf(MageError)
          expect(denied?.code).to.equal(ErrPermissionDenied)
          expect(denied?.data.permission).to.equal('UPDATE_OBSERVATION')
        })
      })
    })

    it('denies in all other cases', async function() {

      let denied = await permissions.ensureUpdateObservationPermission(context)

      expect(denied).to.be.instanceOf(MageError)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data.permission).to.equal('UPDATE_OBSERVATION')
    })
  })
})