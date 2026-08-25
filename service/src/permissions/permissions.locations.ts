import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { UserLocationPermissionService, UserLocationRequestContext } from '../app.api/locations/app.api.locations'
import { LocationPermission } from '../entities/authorization/entities.permissions'
import { EventAccessType } from '../entities/events/entities.events'
import { EventPermissionServiceImpl } from './permissions.events'
import { ensureContextUserHasPermission, userRoleHasPermission } from './permissions.role-based.base'

export class UserLocationPermissionServiceImpl implements UserLocationPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureCreateLocationPermission(context: UserLocationRequestContext): Promise<null | PermissionDeniedError> {
    const denied = ensureContextUserHasPermission(context, LocationPermission.CREATE_LOCATION)
    if (denied) {
      return denied
    }
    const user = context.requestingPrincipal()
    const isParticipant = await this.eventPermissions.userIsParticipantInEvent(context.mageEvent, user.id)
    return isParticipant ? null : permissionDenied(LocationPermission.CREATE_LOCATION, user.id)
  }

  async ensureReadLocationPermission(context: UserLocationRequestContext): Promise<null | PermissionDeniedError> {
    const user = context.requestingPrincipal()
    if (userRoleHasPermission(user, LocationPermission.READ_LOCATION_ALL)) {
      return null
    }
    if (userRoleHasPermission(user, LocationPermission.READ_LOCATION_EVENT)) {
      // Make sure I am part of this event
      if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
        return null
      }
    }
    return permissionDenied('READ_LOCATION', user.id)
  }
}
