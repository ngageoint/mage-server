import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import uniqid from 'uniqid'
import { RoleBasedLocationsPermissionService } from '../../lib/permissions/permissions.locations'
import { LocationRequestContext } from '../../lib/app.api/locations/app.api.locations'
import { EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { UserWithRole } from '../../lib/permissions/permissions.role-based.base'
import { MageEvent } from '../../lib/entities/events/entities.events'
import { LocationPermission } from '../../lib/entities/authorization/entities.permissions'

describe('locations permissions service', function() {

  let permissions: RoleBasedLocationsPermissionService
  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let mageEvent: MageEvent

  function contextFor(permissionsForUser: LocationPermission[]): LocationRequestContext<UserWithRole> {
    const user = {
      id: uniqid(),
      username: 'testuser',
      roleId: {
        id: uniqid(),
        name: 'Role 1',
        permissions: permissionsForUser
      } as any
    } as UserWithRole
    return {
      mageEvent,
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null }
    }
  }

  beforeEach(function() {
    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new RoleBasedLocationsPermissionService(eventPermissions)
    mageEvent = new MageEvent({
      id: 357,
      name: 'Location Permissions Tests',
      forms: [],
      layerIds: [],
      feedIds: [],
      acl: {},
      style: {}
    })
  })

  describe('create permission', function() {

    it('grants when the user has create permission and is a participant in the event', async function() {
      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      const context = contextFor([LocationPermission.CREATE_LOCATION])

      const denied = await permissions.ensureCreateLocationsPermission(context)

      expect(denied).to.be.null
    })

    it('denies when the user has create permission but is not a participant in the event', async function() {
      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(false)
      const context = contextFor([LocationPermission.CREATE_LOCATION])

      const denied = await permissions.ensureCreateLocationsPermission(context)

      expect(denied?.data.permission).to.equal(LocationPermission.CREATE_LOCATION)
    })

    it('denies when the user does not have create permission', async function() {
      eventPermissions.userIsParticipantInEvent(Arg.all()).resolves(true)
      const context = contextFor([])

      const denied = await permissions.ensureCreateLocationsPermission(context)

      expect(denied?.data.permission).to.equal(LocationPermission.CREATE_LOCATION)
      eventPermissions.didNotReceive().userIsParticipantInEvent(Arg.all())
    })
  })

  describe('read permission', function() {

    it('grants when the user has read-all permission', async function() {
      const context = contextFor([LocationPermission.READ_LOCATION_ALL])

      const denied = await permissions.ensureReadLocationsPermission(context)

      expect(denied).to.be.null
      eventPermissions.didNotReceive().userHasEventPermission(Arg.all())
    })

    it('grants when the user has read-event permission and has event read access', async function() {
      eventPermissions.userHasEventPermission(Arg.all()).resolves(true)
      const context = contextFor([LocationPermission.READ_LOCATION_EVENT])

      const denied = await permissions.ensureReadLocationsPermission(context)

      expect(denied).to.be.null
    })

    it('denies when the user has read-event permission but lacks event read access', async function() {
      eventPermissions.userHasEventPermission(Arg.all()).resolves(false)
      const context = contextFor([LocationPermission.READ_LOCATION_EVENT])

      const denied = await permissions.ensureReadLocationsPermission(context)

      expect(denied?.data.permission).to.equal(LocationPermission.READ_LOCATION_EVENT)
    })

    it('denies when the user has neither read permission', async function() {
      const context = contextFor([])

      const denied = await permissions.ensureReadLocationsPermission(context)

      expect(denied?.data.permission).to.equal(LocationPermission.READ_LOCATION_EVENT)
    })
  })
})
