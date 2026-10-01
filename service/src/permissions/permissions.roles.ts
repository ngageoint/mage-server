import { RolePermissionService, RoleRequestContext } from '../app.api/roles/app.api.roles'
import { PermissionDeniedError } from '../app.api/app.api.errors'
import { RolePermission } from '../entities/authorization/entities.permissions'
import { ensureContextUserHasPermission } from './permissions.role-based.base'

export class RolePermissionServiceImpl implements RolePermissionService {
  async ensureReadRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, RolePermission.READ_ROLE)
  }

  async ensureCreateRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, RolePermission.CREATE_ROLE)
  }

  async ensureUpdateRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, RolePermission.UPDATE_ROLE)
  }

  async ensureDeleteRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, RolePermission.DELETE_ROLE)
  }
}
