import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { ObservationPermissionService, ObservationRequestContext } from '../app.api/observations/app.api.observations'
import { ObservationPermission } from '../entities/authorization/entities.permissions'
import { EventPermissionServiceImpl } from './permissions.events'
import { ensureContextUserHasPermission, UserWithRole } from './permissions.role-based.base'

export class ObservationPermissionsServiceImpl implements ObservationPermissionService {

  constructor(private eventPermissions: EventPermissionServiceImpl) {}

  async ensureCreateObservationPermission(context: ObservationRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    const denied = await ensureContextUserHasPermission(context, ObservationPermission.CREATE_OBSERVATION)
    if (denied) {
      return denied
    }
    const user = context.requestingPrincipal()
    const isParticipant = await this.eventPermissions.userIsParticipantInEvent(context.mageEvent, user.id)
    return isParticipant ? null : permissionDenied(ObservationPermission.CREATE_OBSERVATION, user.id)
  }

  ensureUpdateObservationPermission(context: ObservationRequestContext): Promise<PermissionDeniedError | null> {
    throw new Error('unimplemented')
  }
}