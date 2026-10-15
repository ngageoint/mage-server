import { UsersPermissionService } from '../app.api/users/app.api.users'
import { AppRequestContext } from '../app.api/app.api.global'
import { UsersPermission } from '../entities/authorization/entities.permissions'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'
import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { UserPreferencePermissionService } from '../app.api/preferences/app.api.preferences'

export class RoleBasedUsersPermissionService implements UsersPermissionService {
  async ensureReadUsersPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, UsersPermission.READ_USER)
  }
}

export class RoleBasedUserPreferencesPermissionService implements UserPreferencePermissionService {
  async ensureGetEventPreferencePermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    return user ? null : permissionDenied('UPDATE', 'principal')
  }
}