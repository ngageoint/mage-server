import { UserDocument } from '../models/user'
import { RoleDocument } from '../models/role'
import { AppRequestContext } from '../app.api/app.api.global'
import { PermissionDeniedError, permissionDenied } from '../app.api/app.api.errors'
import { AnyPermission } from '../entities/authorization/entities.permissions'

/**
 * TODO: This should not be statically linked to the Mongoose Document type but
 * for now this is the quick and dirty way because the legacy web adapter layer
 * puts the user Mongoose document on the request.
 */
export type UserWithRole = UserDocument & {
  roleId: RoleDocument
}

export function ensureContextUserHasPermission(context: AppRequestContext<UserWithRole>, permission: AnyPermission): null | PermissionDeniedError {
  const user = context.requestingPrincipal()
  const role = user.roleId
  if (role.permissions.includes(permission)) {
    return null
  }

  return permissionDenied(permission, user.username)
}