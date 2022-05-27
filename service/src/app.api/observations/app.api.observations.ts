import { PageOf, PagingParameters } from '../../entities/entities.global'
import { EntityNotFoundError, InvalidInputError, MageError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { URL } from 'url'
import { Attachment, EventScopedObservationRepository, Observation, ObservationId } from '../../entities/observations/entities.observations'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'



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
export interface SaveObservationRequest extends AppRequest {

}

// TODO: add other model json transformation here
export type UserObservation = Omit<Observation, 'attachments'> & {
  attachments: UserAttachment[]
}

export type UserAttachment = Omit<Attachment, 'thumbnails'>

export interface ObservationPermissionService {
  ensureCreateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
  ensureUpdateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
}
