import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequestContext } from '../app.api/app.api.global'
import { ExportAppLayerPermissionService } from '../app.api/exports/app.api.exports'
import { EventRequestContext } from '../app.api/events/app.api.events'
import { EventAccessType } from '../entities/events/entities.events'
import { EventPermissionServiceImpl } from './permissions.events'
import { UserWithRole } from './permissions.role-based.base'

export class RoleBasedExportsPermissionService implements ExportAppLayerPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureCreateExportPermission(context: EventRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    const user = context.requestingPrincipal()

    // Ensure user is part of this event
    if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
      return null
    }

    return permissionDenied('CREATE EXPORT', user.id)
  }

  async ensureGetMyExportPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    return user ? null : permissionDenied('READ EXPORT', 'principal')
  }

  async ensureGetMyExportContentPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    return user ? null : permissionDenied('READ EXPORT CONTENT', 'principal')
  }

  async ensureDeleteMyExportPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    return user ? null : permissionDenied('DELETE EXPORT', 'principal')
  }
}