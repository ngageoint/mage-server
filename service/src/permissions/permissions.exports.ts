import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequestContext } from '../app.api/app.api.global'
import { CreateExportRequestContext, ExportAppLayerPermissionService } from '../app.api/exports/app.api.exports'
import { ExportPermission } from '../entities/authorization/entities.permissions'
import { EventAccessType } from '../entities/events/entities.events'
import { EventPermissionServiceImpl } from './permissions.events'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'

export class RoleBasedExportsPermissionService implements ExportAppLayerPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureCreateExportPermission(context: CreateExportRequestContext): Promise<PermissionDeniedError | null> {
    const user = context.requestingPrincipal()

    // Ensure user is part of this event
    if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
      return null
    }
    
    return permissionDenied('CREATE_EXPORT', user.id)
  }

  async ensureGetMyExportPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, ExportPermission.READ_EXPORT)
  }

  async ensureGetExportContentPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, ExportPermission.READ_EXPORT)
  }

  async ensureDeleteMyExportPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    // TODO, shouldn't need this permission to delete your own export
    return ensureContextUserHasPermission(context, ExportPermission.DELETE_EXPORT)
  }
}