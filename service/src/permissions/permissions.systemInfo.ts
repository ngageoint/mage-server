import {
  permissionDenied,
  PermissionDeniedError
} from '../app.api/app.api.errors';
import { AppRequestContext } from '../app.api/app.api.global';
import { SystemInfoPermissionService } from '../app.api/systemInfo/app.api.systemInfo';
import { SystemInfoPermission } from '../entities/authorization/entities.permissions';
import {
  UserWithRole,
} from './permissions.role-based.base';

export class RoleBasedSystemInfoPermissionService implements SystemInfoPermissionService {
  async ensureReadSystemInfoPermission(ctx: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = ctx.requestingPrincipal();

    // If user doesn't exist, deny permission.
    if (!user) {
      return permissionDenied(
        SystemInfoPermission.READ_SYSTEM_INFO,
        'Unknown User',
        'SystemInfo'
      );
    }

    // Check if the user's role has the required permission.
    if (
      user.roleId.permissions.includes(SystemInfoPermission.READ_SYSTEM_INFO)
    ) {
      return null; // This means no error and the user has permission
    } else {
      return permissionDenied(
        SystemInfoPermission.READ_SYSTEM_INFO,
        user.username,
        'SystemInfo'
      );
    }
  }
}

