import { EventAclEntry, ListEventAcl, ListEventAclRequest, RemoveEventAclUser, RemoveEventAclUserRequest, SetEventAclRole, SetEventAclRoleRequest } from '../../app.api/events/app.api.events.acl'
import { entityNotFound, invalidInput, permissionDenied, PermissionDeniedError } from '../../app.api/app.api.errors'
import { AppRequestContext, AppResponse } from '../../app.api/app.api.global'
import { MageEventPermission } from '../../entities/authorization/entities.permissions'
import { Acl, EventAccessType, EventRole, MageEvent } from '../../entities/events/entities.events'
import { EventAclRepository } from '../../entities/events/entities.events.acl'
import { UserId, UserRepository } from '../../entities/users/entities.users'
import { EventPermissionServiceImpl } from '../../permissions/permissions.events'
import { userRoleHasPermission, UserWithRole } from '../../permissions/permissions.role-based.base'

export function ListEventAcl(permissionService: EventPermissionServiceImpl, userRepo: UserRepository): ListEventAcl {
  return async function(req: ListEventAclRequest): ReturnType<ListEventAcl> {
    const event = req.context.mageEvent
    const denied = await ensureEventUpdatePermission(permissionService, event, req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    return AppResponse.success(await aclEntries(event.acl, userRepo))
  }
}

export function SetEventAclRole(permissionService: EventPermissionServiceImpl, aclRepo: EventAclRepository, userRepo: UserRepository): SetEventAclRole {
  return async function(req: SetEventAclRoleRequest): ReturnType<SetEventAclRole> {
    if (!Object.values(EventRole).includes(req.role)) {
      return AppResponse.error(invalidInput('invalid event role', [ req.role, 'role' ]))
    }
    const event = req.context.mageEvent
    const denied = await ensureEventUpdatePermission(permissionService, event, req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    if (req.role === EventRole.OWNER || event.acl[req.user]?.role === EventRole.OWNER) {
      const ownerDenied = ensureCanManageOwners(event, req.context)
      if (ownerDenied) {
        return AppResponse.error(ownerDenied)
      }
    }
    const user = await userRepo.findById(req.user).catch(() => null)
    if (!user) {
      return AppResponse.error(entityNotFound(req.user, 'User'))
    }
    if (req.role !== EventRole.OWNER && isLastOwner(event.acl, req.user)) {
      return AppResponse.error(invalidInput('event must have at least one owner', [ req.role, 'role' ]))
    }
    const acl = await aclRepo.setUserRole(event.id, req.user, req.role)
    if (!acl) {
      return AppResponse.error(entityNotFound(event.id, 'MageEvent', 'event removed before update'))
    }
    return AppResponse.success(await aclEntries(acl, userRepo))
  }
}

export function RemoveEventAclUser(permissionService: EventPermissionServiceImpl, aclRepo: EventAclRepository, userRepo: UserRepository): RemoveEventAclUser {
  return async function(req: RemoveEventAclUserRequest): ReturnType<RemoveEventAclUser> {
    const event = req.context.mageEvent
    const denied = await ensureEventUpdatePermission(permissionService, event, req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    if (!event.acl[req.user]) {
      return AppResponse.error(entityNotFound(req.user, 'MageEvent.acl'))
    }
    if (event.acl[req.user].role === EventRole.OWNER) {
      const ownerDenied = ensureCanManageOwners(event, req.context)
      if (ownerDenied) {
        return AppResponse.error(ownerDenied)
      }
    }
    if (isLastOwner(event.acl, req.user)) {
      return AppResponse.error(invalidInput('the event must have at least one owner', [ req.user, 'user' ]))
    }
    const acl = await aclRepo.removeUser(event.id, req.user)
    if (!acl) {
      return AppResponse.error(entityNotFound(event.id, 'MageEvent', 'event removed before update'))
    }
    return AppResponse.success(await aclEntries(acl, userRepo))
  }
}

function ensureEventUpdatePermission(permissionService: EventPermissionServiceImpl, event: MageEvent, context: AppRequestContext): Promise<PermissionDeniedError | null> {
  const principal = context.requestingPrincipal() as UserWithRole
  return permissionService.authorizeEventAccess(event, principal, MageEventPermission.UPDATE_EVENT, EventAccessType.Update)
}

function ensureCanManageOwners(event: MageEvent, context: AppRequestContext): PermissionDeniedError | null {
  const principal = context.requestingPrincipal() as UserWithRole
  if (userRoleHasPermission(principal, MageEventPermission.UPDATE_EVENT) || event.acl[principal.id]?.role === EventRole.OWNER) {
    return null
  }
  return permissionDenied(MageEventPermission.UPDATE_EVENT, principal.username, String(event.id))
}

function isLastOwner(acl: Acl, user: UserId): boolean {
  if (acl[user]?.role !== EventRole.OWNER) {
    return false
  }
  return Object.values(acl).filter(entry => entry.role === EventRole.OWNER).length === 1
}

async function aclEntries(acl: Acl, userRepo: UserRepository): Promise<EventAclEntry[]> {
  const userIds = Object.keys(acl)
  const users = await userRepo.findAllByIds(userIds)
  const entries: EventAclEntry[] = []
  for (const userId of userIds) {
    const user = users[userId]
    if (user) {
      const { id, username, displayName, email } = user
      entries.push({ user: { id, username, displayName, email }, role: acl[userId].role, permissions: acl[userId].permissions })
    }
  }
  return entries.sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
}
