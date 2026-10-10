import { expect } from 'chai'
import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { Acl, EventAccessType, EventRole, EventRolePermissions, MageEvent } from '../../../lib/entities/events/entities.events'
import { EventAclRepository } from '../../../lib/entities/events/entities.events.acl'
import { User, UserRepository } from '../../../lib/entities/users/entities.users'
import * as api from '../../../lib/app.api/events/app.api.events.acl'
import { EventRequest } from '../../../lib/app.api/events/app.api.events'
import { ListEventAcl, RemoveEventAclUser, SetEventAclRole } from '../../../lib/app.impl/events/app.impl.events.acl'
import { ErrEntityNotFound, ErrInvalidInput, ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors'
import { EventPermissionServiceImpl } from '../../../lib/permissions/permissions.events'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

function principalFor(user: User, rolePermissions: string[] = []): UserWithRole {
  return { ...user, roleId: { permissions: rolePermissions } } as unknown as UserWithRole
}

function aclOf(roles: Record<string, EventRole>): Acl {
  return Object.entries(roles).reduce((acl, [ userId, role ]) => {
    acl[userId] = { role, permissions: [ ...EventRolePermissions[role] ] }
    return acl
  }, {} as Acl)
}

function userWith(id: string, displayName: string): User {
  return { id, username: displayName.toLowerCase(), displayName, email: `${id}@test.mage` } as User
}

describe('event acl use case interactions', function() {

  const owner = userWith('owner1', 'Owner User')
  const manager = userWith('manager1', 'Manager User')
  const guest = userWith('guest1', 'Guest User')
  const byOwner = principalFor(owner)
  const byManager = principalFor(manager)
  const byAdmin = principalFor(guest, [ 'UPDATE_EVENT' ])

  let aclRepo: SubstituteOf<EventAclRepository>
  let userRepo: SubstituteOf<UserRepository>
  let permissionService: SubstituteOf<EventPermissionServiceImpl>
  let event: MageEvent

  const requestBy = <P extends object>(principal: UserWithRole, params: P): EventRequest<UserWithRole> & P => {
    return {
      context: {
        requestToken: Symbol(),
        requestingPrincipal: () => principal,
        locale() { return null },
        mageEvent: event
      },
      ...params
    }
  }

  // Configure each of these once per test; substitutes cannot re-configure a call
  const allowUpdate = () => permissionService.authorizeEventAccess(Arg.all()).resolves(null)
  const denyUpdate = () => permissionService.authorizeEventAccess(Arg.all())
    .resolves(permissionDenied('UPDATE_EVENT', 'someone', String(event.id)))
  const usersFound = (users: Record<string, User | null>) => userRepo.findAllByIds(Arg.all()).resolves(users)

  beforeEach(function() {
    aclRepo = Sub.for<EventAclRepository>()
    userRepo = Sub.for<UserRepository>()
    permissionService = Sub.for<EventPermissionServiceImpl>()
    event = new MageEvent({
      id: 123,
      name: 'Access Test',
      teamIds: [],
      layerIds: [],
      style: {},
      forms: [],
      feedIds: [],
      acl: aclOf({ [owner.id]: EventRole.OWNER, [manager.id]: EventRole.MANAGER })
    })
  })

  describe('listing the acl', function() {

    let listEventAcl: api.ListEventAcl

    beforeEach(function() {
      listEventAcl = ListEventAcl(permissionService, userRepo)
    })

    it('returns the acl entries with user details sorted by display name', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: manager })

      const res = await listEventAcl(requestBy(byOwner, {}))

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal([
        {
          user: { id: manager.id, username: manager.username, displayName: manager.displayName, email: manager.email },
          role: EventRole.MANAGER,
          permissions: [ EventAccessType.Read, EventAccessType.Update ]
        },
        {
          user: { id: owner.id, username: owner.username, displayName: owner.displayName, email: owner.email },
          role: EventRole.OWNER,
          permissions: [ EventAccessType.Read, EventAccessType.Update, EventAccessType.Delete ]
        }
      ])
    })

    it('omits entries for users that no longer exist', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: null })

      const res = await listEventAcl(requestBy(byOwner, {}))

      expect(res.success?.map(x => x.user.id)).to.deep.equal([ owner.id ])
    })

    it('checks permission to update the event', async function() {

      denyUpdate()

      const res = await listEventAcl(requestBy(byOwner, {}))

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('setting a user role', function() {

    let setEventAclRole: api.SetEventAclRole

    beforeEach(function() {
      setEventAclRole = SetEventAclRole(permissionService, aclRepo, userRepo)
      userRepo.findById(guest.id).resolves(guest)
      userRepo.findById(owner.id).resolves(owner)
      userRepo.findById('nobody').resolves(null)
      userRepo.findById('1').rejects(new Error('cast to ObjectId failed'))
    })

    it('adds a user to the acl and returns the updated entries', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: manager, [guest.id]: guest })
      aclRepo.setUserRole(event.id, guest.id, EventRole.GUEST)
        .resolves(aclOf({ [owner.id]: EventRole.OWNER, [manager.id]: EventRole.MANAGER, [guest.id]: EventRole.GUEST }))

      const res = await setEventAclRole(requestBy(byOwner, { user: guest.id, role: EventRole.GUEST }))

      expect(res.error).to.be.null
      expect(res.success?.map(x => [ x.user.id, x.role ])).to.deep.equal([
        [ guest.id, EventRole.GUEST ],
        [ manager.id, EventRole.MANAGER ],
        [ owner.id, EventRole.OWNER ]
      ])
      aclRepo.received(1).setUserRole(event.id, guest.id, EventRole.GUEST)
    })

    it('rejects an invalid role', async function() {

      allowUpdate()

      const res = await setEventAclRole(requestBy(byOwner, { user: guest.id, role: 'NOTHING' }) as any)

      expect(res.error?.code).to.equal(ErrInvalidInput)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('fails if the user does not exist', async function() {

      allowUpdate()

      const res = await setEventAclRole(requestBy(byOwner, { user: 'nobody', role: EventRole.GUEST }))

      expect(res.error?.code).to.equal(ErrEntityNotFound)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('treats a failed user lookup as not found', async function() {

      allowUpdate()

      const res = await setEventAclRole(requestBy(byOwner, { user: '1', role: EventRole.GUEST }))

      expect(res.error?.code).to.equal(ErrEntityNotFound)
    })

    it('does not demote the last owner', async function() {

      allowUpdate()

      const res = await setEventAclRole(requestBy(byOwner, { user: owner.id, role: EventRole.MANAGER }))

      expect(res.error?.code).to.equal(ErrInvalidInput)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('demotes an owner when another owner remains', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: manager })
      event.acl[manager.id] = { role: EventRole.OWNER, permissions: [ ...EventRolePermissions.OWNER ] }
      aclRepo.setUserRole(event.id, owner.id, EventRole.MANAGER)
        .resolves(aclOf({ [owner.id]: EventRole.MANAGER, [manager.id]: EventRole.OWNER }))

      const res = await setEventAclRole(requestBy(byOwner, { user: owner.id, role: EventRole.MANAGER }))

      expect(res.error).to.be.null
      aclRepo.received(1).setUserRole(event.id, owner.id, EventRole.MANAGER)
    })

    it('checks permission to update the event', async function() {

      denyUpdate()

      const res = await setEventAclRole(requestBy(byOwner, { user: guest.id, role: EventRole.GUEST }))

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('lets a manager set the role of a guest or manager', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: manager, [guest.id]: guest })
      aclRepo.setUserRole(event.id, guest.id, EventRole.MANAGER)
        .resolves(aclOf({ [owner.id]: EventRole.OWNER, [manager.id]: EventRole.MANAGER, [guest.id]: EventRole.MANAGER }))

      const res = await setEventAclRole(requestBy(byManager, { user: guest.id, role: EventRole.MANAGER }))

      expect(res.error).to.be.null
      aclRepo.received(1).setUserRole(event.id, guest.id, EventRole.MANAGER)
    })

    it('does not let a manager grant the owner role', async function() {

      allowUpdate()

      const res = await setEventAclRole(requestBy(byManager, { user: manager.id, role: EventRole.OWNER }))

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('does not let a manager change the role of an owner', async function() {

      allowUpdate()
      event.acl[guest.id] = { role: EventRole.OWNER, permissions: [ ...EventRolePermissions.OWNER ] }

      const res = await setEventAclRole(requestBy(byManager, { user: owner.id, role: EventRole.GUEST }))

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      aclRepo.didNotReceive().setUserRole(Arg.all())
    })

    it('lets a user with the update event role permission grant the owner role', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner, [manager.id]: manager, [guest.id]: guest })
      aclRepo.setUserRole(event.id, guest.id, EventRole.OWNER)
        .resolves(aclOf({ [owner.id]: EventRole.OWNER, [manager.id]: EventRole.MANAGER, [guest.id]: EventRole.OWNER }))

      const res = await setEventAclRole(requestBy(byAdmin, { user: guest.id, role: EventRole.OWNER }))

      expect(res.error).to.be.null
      aclRepo.received(1).setUserRole(event.id, guest.id, EventRole.OWNER)
    })
  })

  describe('removing a user', function() {

    let removeEventAclUser: api.RemoveEventAclUser

    beforeEach(function() {
      removeEventAclUser = RemoveEventAclUser(permissionService, aclRepo, userRepo)
    })

    it('removes the user and returns the updated entries', async function() {

      allowUpdate()
      usersFound({ [owner.id]: owner })
      aclRepo.removeUser(event.id, manager.id).resolves(aclOf({ [owner.id]: EventRole.OWNER }))

      const res = await removeEventAclUser(requestBy(byOwner, { user: manager.id }))

      expect(res.error).to.be.null
      expect(res.success?.map(x => x.user.id)).to.deep.equal([ owner.id ])
      aclRepo.received(1).removeUser(event.id, manager.id)
    })

    it('fails if the user is not in the acl', async function() {

      allowUpdate()

      const res = await removeEventAclUser(requestBy(byOwner, { user: guest.id }))

      expect(res.error?.code).to.equal(ErrEntityNotFound)
      aclRepo.didNotReceive().removeUser(Arg.all())
    })

    it('does not remove the last owner', async function() {

      allowUpdate()

      const res = await removeEventAclUser(requestBy(byOwner, { user: owner.id }))

      expect(res.error?.code).to.equal(ErrInvalidInput)
      aclRepo.didNotReceive().removeUser(Arg.all())
    })

    it('checks permission to update the event', async function() {

      denyUpdate()

      const res = await removeEventAclUser(requestBy(byOwner, { user: manager.id }))

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      aclRepo.didNotReceive().removeUser(Arg.all())
    })

    it('does not let a manager remove an owner', async function() {

      allowUpdate()
      event.acl[guest.id] = { role: EventRole.OWNER, permissions: [ ...EventRolePermissions.OWNER ] }

      const res = await removeEventAclUser(requestBy(byManager, { user: owner.id }))

      expect(res.error?.code).to.equal(ErrPermissionDenied)
      aclRepo.didNotReceive().removeUser(Arg.all())
    })
  })
})
