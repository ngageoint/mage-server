import { PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequestContext } from '../app.api/app.api.global'
import { SearchIndexPermissionService } from '../app.api/observations/app.api.observations.search'
import { MageEventPermission } from '../entities/authorization/entities.permissions'
import { EventPermissionServiceImpl } from './permissions.events'
import { ensureContextUserHasPermission, UserWithRole } from './permissions.role-based.base'

export class SearchIndexPermissionsServiceImpl implements SearchIndexPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureSearchIndexAllPermission(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, MageEventPermission.UPDATE_EVENT)
  }

  async ensureSearchIndexEventPermission(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return this.eventPermissions.ensureEventUpdatePermission(context)
  }
}
