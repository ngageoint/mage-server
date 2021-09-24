import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequestContext } from '../app.api/app.api.global'
import { StaticIconPermissionService } from '../app.api/icons/app.api.icons'
import { StaticIconPermission } from '../entities/authorization/entities.permissions'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'


export class RoleBasedStaticIconPermissionService implements StaticIconPermissionService {

  async ensureCreateStaticIconPermission(ctx: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(ctx, StaticIconPermission.STATIC_ICON_WRITE)
  }

  async ensureGetStaticIconPermission(ctx: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return null
  }
}