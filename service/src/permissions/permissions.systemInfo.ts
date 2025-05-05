import {
  permissionDenied,
  PermissionDeniedError
} from '../app.api/app.api.errors';
import { AppRequestContext } from '../app.api/app.api.global';
import { SystemInfoPermissionService } from '../app.api/systemInfo/app.api.systemInfo';
import { SystemInfoPermission } from '../entities/authorization/entities.permissions';
import {
  UserWithRole,
  ensureContextUserHasPermission
} from './permissions.role-based.base';

export class RoleBasedSystemInfoPermissionService implements SystemInfoPermissionService {
  async ensureReadSystemInfoPermission(ctx: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(
      ctx,
      SystemInfoPermission.READ_SYSTEM_INFO
    );
  }
}


