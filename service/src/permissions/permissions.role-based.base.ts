import { UserModelInstance } from '../models/user'
import { RoleModelInstance } from '../models/role'
import { AppRequestContext } from '../app.api/app.api.global'
import { PermissionDeniedError, permissionDenied } from '../app.api/app.api.errors'
import { AnyPermission } from '../entities/authorization/entities.permissions'

export type AnonymousUser = {
  roleId?: never
}

/**
 * TODO: This should not be statically linked to the Mongoose Document type but
 * for now this is the quick and dirty way because the legacy web adapter layer
 * puts the user Mongoose document on the request.
 */
export type UserWithRole = Omit<UserModelInstance, 'roleId'> & {
  roleId: RoleModelInstance
}

export function ensureContextUserHasPermission(context: AppRequestContext<UserWithRole | AnonymousUser>, permission: AnyPermission): null | PermissionDeniedError {
  const user = context.requestingPrincipal()
  if (user.roleId) {
    const role = user.roleId
    if (role.permissions.includes(permission)) {
      return null
    }
    return permissionDenied(permission, user.username)
  } else {
    return permissionDenied(permission, 'anonymous')
  }
}

/**
 * TODO: This is a legacy function originally located in the `access/index.ts` module.  Legacy web routes still use
 * this function.  This can be deleted when all legacy routes transition to
 */
export function userRoleHasPermission(user: UserWithRole, permission: AnyPermission): boolean {
  if (!user || !user.roleId) {
    return false
  }
  const role = user.roleId as RoleModelInstance
  return role.permissions.indexOf(permission) !== -1
}
