import { EntityNotFoundError, InvalidInputError, MageError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { Attachment, copyObservationAttrs, EventScopedObservationRepository, FormEntry, FormFieldEntry, FormFieldEntryItem, Observation, ObservationAttrs, ObservationFeatureProperties, ObservationId } from '../../entities/observations/entities.observations'
import { MageEvent } from '../../entities/events/entities.events'
import _ from 'lodash'
import { UserId } from '../../entities/users/entities.users'



export interface ObservationRequestContext<Principal = unknown> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
  /**
   * TODO: This is obviously redundant with respect to `requestingPrincipal()`,
   * but that is in a transitional phase because that returns a Mongoose
   * `UserDocument` instead of a `User` entity.  `requestPrincipal()` should
   * probably be a user-device pair, eventually.
   */
  userId: UserId
  deviceId: string
  observationRepository: EventScopedObservationRepository
}
export interface ObservationRequest<Principal = unknown> extends AppRequest<Principal, ObservationRequestContext<Principal>> {}

export interface AllocateObservationId {
  (req: AllocateObservationIdRequest): Promise<AppResponse<ObservationId, PermissionDeniedError>>
}
export interface AllocateObservationIdRequest extends ObservationRequest {}

export interface SaveObservation {
  (req: SaveObservationRequest): Promise<AppResponse<ExoObservation, PermissionDeniedError | EntityNotFoundError | InvalidInputError>>
}
export interface SaveObservationRequest extends ObservationRequest {
  observation: ExoObservationMod
}

// TODO: add other model json transformation here

/**
 * ExoObservation refers to the view of observations that app clients receive
 * and send, the exo- prefix indicating the outermost, client-facing layer of
 * the application.
 */
export type ExoObservation = Omit<ObservationAttrs, 'attachments'> & {
  attachments: ExoAttachment[]
}

export type ExoAttachment = Omit<Attachment, 'thumbnails' | 'contentLocator'>

export type ExoObservationMod = Omit<ExoObservation, 'eventId' | 'createdAt' | 'lastModified' | 'properties' | 'states' | 'attachments'> & {
  properties: ExoObservationPropertiesMod
}

export type ExoObservationPropertiesMod = Omit<ObservationFeatureProperties, 'forms'> & {
  forms: ExoFormEntryMod[]
}


export type ExoFormEntryMod =
  & Partial<Pick<FormEntry, 'id'>>
  & Pick<FormEntry, 'formId'>
  & { [formFieldName: string]: FormFieldEntry | ExoAttachmentMod[] }

export type ExoAttachmentMod = Partial<ExoAttachment> & {
  /**
   * TODO: Ignore attachment mods without an action?
   */
  action?: AttachmentModAction
  id?: any
}

export enum AttachmentModAction {
  Add = 'add',
  Delete = 'delete',
}

export function exoObservationFor(from: ObservationAttrs): ExoObservation {
  const attrs = copyObservationAttrs(from)
  const attachments = attrs.attachments.map(exoAttachmentFor)
  return {
    ...attrs,
    attachments
  }
}

export function exoAttachmentFor(from: Attachment): ExoAttachment {
  return _.omit(from, 'thumbnails', 'contentLocator')
}

export function domainObservationFor(from: ExoObservation): ObservationAttrs {
  return {
    ...from,
    attachments: from.attachments.map(domainAttachmentFor)
  }
}

export function domainAttachmentFor(from: ExoAttachment): Attachment {
  return {
    ...from,
    thumbnails: []
  }
}

export interface ObservationPermissionService {
  /**
   * Create permission applies when {@link AllocateObservationId | allocating}
   * new observation IDs, as well as saving a new observation.
   */
  ensureCreateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
  /**
   * Update permission applies when updating an existing observation.
   */
  ensureUpdateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
}
