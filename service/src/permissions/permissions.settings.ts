import { AppRequestContext } from '../app.api/app.api.global'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'
import { PermissionDeniedError } from '../app.api/app.api.errors'
import { SettingsPermissionService } from '../app.api/settings/app.api.settings'
import { SettingPermission } from '../entities/authorization/entities.permissions'

export class RoleBasedMapPermissionService implements SettingsPermissionService {
  async ensureFetchMapSettingsPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, SettingPermission.MAP_SETTINGS_READ)
  }

  async ensureUpdateMapSettingsPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, SettingPermission.MAP_SETTINGS_UPDATE)
  }
}