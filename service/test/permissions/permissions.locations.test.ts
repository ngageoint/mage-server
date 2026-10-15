import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { EventAccessType, MageEvent } from '../../lib/entities/events/entities.events'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import { expect } from 'chai'
import { LocationPermission } from '../../lib/entities/authorization/entities.permissions'
import { ErrPermissionDenied, MageError, PermissionDeniedError } from '../../lib/app.api/app.api.errors'
import uniqid from 'uniqid'
import { UserLocationPermissionServiceImpl } from '../../lib/permissions/permissions.locations'
import { UserLocationRequestContext } from '../../lib/app.api/locations/app.api.locations'

describe('location permissions service', function() {

  let permissions: UserLocationPermissionServiceImpl
  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let mageEvent: MageEvent
  let user: UserWithRole
  let context: UserLocationRequestContext<UserWithRole>

  beforeEach(function() {
    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new UserLocationPermissionServiceImpl(eventPermissions)
    mageEvent = new MageEvent({
      id: 357,
      name: 'Obsevation Permissions Tests',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
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
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  })

  describe('create permission', function() {

    it('grants when the user role has create location permission and the user is a participant of the event', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ LocationPermission.CREATE_LOCATION ]
      const denied = await permissions.ensureCreateLocationPermission(context)

      expect(denied).to.be.null
    })

    it('denies when the context user is not an event participant', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(false)
      user.roleId.permissions = [ LocationPermission.CREATE_LOCATION ]
      const denied = await permissions.ensureCreateLocationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })

    it('denies when the context user role does not include create permission', async function() {

      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      user.roleId.permissions = [ LocationPermission.READ_LOCATION_ALL ]
      const denied = await permissions.ensureCreateLocationPermission(context) as PermissionDeniedError

      expect(denied).to.be.instanceOf(MageError)
      expect(denied.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('read permission', function() {

    it('grants when the context user role has permission to read all locations globally', async function() {

      user.roleId.permissions = [ LocationPermission.READ_LOCATION_ALL ]
      const denied = await permissions.ensureReadLocationPermission(context)

      expect(denied).to.be.null
    })

    it('grants when the context user role has event event-scoped read permission and the event acl has an entry for the user', async function() {

      user.roleId.permissions = [ LocationPermission.READ_LOCATION_EVENT ]
      eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read).resolves(true)
      const denied = await permissions.ensureReadLocationPermission(context)

      expect(denied).to.be.null
    })

    describe('denies', function() {

      const denyTests: [ testName: string, setupContext: () => any ][] = [
        [ 'with empty permissions', () => void(0) ],
        [
          'with participant read permission but without event read access',
          () => {
            user.roleId.permissions = [ LocationPermission.READ_LOCATION_EVENT ]
            eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
          }
        ],
        [
          'with event read access but without participant read permission',
          () => {
            user.roleId.permissions = []
            eventPermissions.userHasEventPermission(Arg.all()).resolves(true)
          }
        ]
      ]
      denyTests.forEach(([ testName, setupContext ]) => {
        it(testName, async function() {
          setupContext()
          const denied = await permissions.ensureReadLocationPermission(context)
          expect(denied).to.be.instanceOf(MageError)
          expect(denied?.code).to.equal(ErrPermissionDenied)
          expect(denied?.data.permission).to.equal('READ_LOCATION')
        })
      })
    })
  })

})
