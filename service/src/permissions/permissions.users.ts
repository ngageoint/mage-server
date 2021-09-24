import { UsersPermissionService } from '../app.api/users/app.api.users'
import { AppRequestContext } from '../app.api/app.api.global'
import { UsersPermission } from '../entities/authorization/entities.permissions'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'
import { PermissionDeniedError } from '../app.api/app.api.errors'


export class RoleBasedUsersPermissionService implements UsersPermissionService {
  async ensureReadUsersPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, UsersPermission.READ_USER)
  }
}