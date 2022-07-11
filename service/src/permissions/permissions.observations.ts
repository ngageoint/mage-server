import access from '../access'
import { permissionDenied, PermissionDeniedError } from '../app.api/app.api.errors'
import { ObservationPermissionService, ObservationRequestContext } from '../app.api/observations/app.api.observations'
import { ObservationPermission } from '../entities/authorization/entities.permissions'
import { EventAccessType } from '../entities/events/entities.events'
import { AttachmentId, Observation } from '../entities/observations/entities.observations'
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

  async ensureUpdateObservationPermission(context: ObservationRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    const user = context.requestingPrincipal()
    if (access.userHasPermission(user, ObservationPermission.UPDATE_OBSERVATION_ALL)) {
      return null
    }
    if (access.userHasPermission(user, ObservationPermission.UPDATE_OBSERVATION_EVENT)) {
      if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
        return null
      }
    }
    return permissionDenied('UPDATE_OBSERVATION', user.id)
  }

  async ensureReadObservationPermission(context: ObservationRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    const user = context.requestingPrincipal()
    if (access.userHasPermission(user, ObservationPermission.READ_OBSERVATION_ALL)) {
      return null
    }
    if (access.userHasPermission(user, ObservationPermission.READ_OBSERVATION_EVENT)) {
      // Make sure I am part of this event
      if (await this.eventPermissions.userHasEventPermission(context.mageEvent, user.id, EventAccessType.Read)) {
        return null
      }
    }
    return permissionDenied('READ_OBSERVATION', user.id)
  }

  async ensureStoreAttachmentContentPermission(context: ObservationRequestContext<UserWithRole>, observation: Observation, attachmentId: AttachmentId): Promise<PermissionDeniedError | null> {
    const user = context.requestingPrincipal()
    const attachment = observation.attachmentFor(attachmentId)
    if (!attachment) {
      return null
    }
    const hasUpdatePermission = await this.ensureUpdateObservationPermission(context).then(x => x === null)
    const contentExists = !!attachment.contentLocator
    if (contentExists) {
      if (hasUpdatePermission) {
        return null
      }
    }
    else {
      if (hasUpdatePermission) {
        return null
      }
      /*
      TODO:
      This create permission check preserves backward compatibility for a MAGE
      client that uses a role with permission only to create observations, but
      not update them.  Adding attachments requires two or more requests, one
      to create the observation document with attachment meta-data embdedded in
      form field entries, and one request per attachment to save the content of
      the attachment(s).  Hence, to support the create-only role, the old
      attachment submission code checked for observation create permission
      instead of observation update permission to ensure that users with the
      create-only role could still add attachment content to observations they
      created.

      This permission check should go away when we implement fully custom roles
      and permissions management, however, we may also need to implement some
      kind of transaction mechanism to group all the requests for submitting an
      observation with attachments, whether creating or updating.  This could
      be some token that the service returns and the API client submits with
      each request until the observation submission is complete.
      */
      const isContextUserCreator = observation.userId === user.id
      if (isContextUserCreator && await this.ensureCreateObservationPermission(context).then(x => x === null)) {
        return null
      }
    }
    return permissionDenied('STORE_ATTACHMENT_CONTENT', user.id, `observation ${observation.id}, attachment ${attachmentId}`)
  }
}