import { LocationPermissionService, LocationRequestContext } from '../app.api/locations/app.api.locations'
import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { LocationPermission } from '../entities/authorization/entities.permissions'
import { EventAccessType } from '../entities/events/entities.events'
import { EventPermissionServiceImpl } from './permissions.events'
import { userRoleHasPermission, UserWithRole } from './permissions.role-based.base'

export class RoleBasedLocationsPermissionService implements LocationPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureCreateLocationsPermission(context: LocationRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    if (!userRoleHasPermission(user, LocationPermission.CREATE_LOCATION)) {
      return permissionDenied(LocationPermission.CREATE_LOCATION, user.username)
    }
    if (await this.eventPermissions.userIsParticipantInEvent(context.mageEvent, user.id)) {
      return null
    }
    return permissionDenied(LocationPermission.CREATE_LOCATION, user.username)
  }

  async ensureReadLocationsPermission(context: LocationRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    if (userRoleHasPermission(user, LocationPermission.READ_LOCATION_ALL)) {
      return null
    }
    if (userRoleHasPermission(user, LocationPermission.READ_LOCATION_EVENT)) {
      if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
        return null
      }
    }
    return permissionDenied(LocationPermission.READ_LOCATION_EVENT, user.username)
  }
}
