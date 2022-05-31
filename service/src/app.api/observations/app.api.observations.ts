import { PageOf, PagingParameters } from '../../entities/entities.global'
import { EntityNotFoundError, InvalidInputError, MageError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { URL } from 'url'
import { Attachment, copyObservationAttrs, EventScopedObservationRepository, Observation, ObservationAttrs, ObservationId } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import _ from 'lodash'



export interface ObservationRequestContext<Principal = unknown> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
  observationRepository: EventScopedObservationRepository
}
export interface ObservationRequest<Principal = unknown, Context extends ObservationRequestContext<Principal> = ObservationRequestContext<Principal>> extends AppRequest<Principal, Context> {}

export interface AllocateObservationId {
  (req: AllocateObservationIdRequest): Promise<AppResponse<ObservationId, PermissionDeniedError>>
}
export interface AllocateObservationIdRequest extends ObservationRequest {}

export interface SaveObservation {
  (req: SaveObservationRequest): Promise<AppResponse<UserObservation, PermissionDeniedError | InvalidInputError>>
}
export interface SaveObservationRequest extends ObservationRequest {
  observation: ObservationSaveAttrs
}

export type ObservationSaveAttrs = Omit<ObservationAttrs, 'eventId'>

// TODO: add other model json transformation here
export type UserObservation = Omit<ObservationAttrs, 'attachments'> & {
  attachments: UserAttachment[]
}

export type UserAttachment = Omit<Attachment, 'thumbnails' | 'contentLocator'>

export function userObservationFor(from: ObservationAttrs): UserObservation {
  const attrs = copyObservationAttrs(from)
  const attachments = attrs.attachments.map(userAttachmentFor)
  return {
    ...attrs,
    attachments
  }
}

export function userAttachmentFor(from: Attachment): UserAttachment {
  return _.omit(from, 'thumbnails', 'contentLocator')
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
