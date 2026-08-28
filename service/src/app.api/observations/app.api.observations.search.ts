import { MageEventAttrs, MageEventId } from '../../entities/events/entities.events'
import { EntityNotFoundError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'

export interface SearchIndexAllEventsRequest<Principal = unknown> extends AppRequest<Principal, AppRequestContext<Principal>> {}
export interface SearchIndexEventRequest<Principal = unknown> extends AppRequest<Principal, AppRequestContext<Principal>> {
  eventId: MageEventId
}

export interface SearchIndexResponse {}

export interface SearchIndexAllEvents {
  (req: SearchIndexAllEventsRequest): Promise<AppResponse<SearchIndexResponse, PermissionDeniedError>>
}

export interface SearchIndexEvent {
  (req: SearchIndexEventRequest): Promise<AppResponse<SearchIndexResponse, PermissionDeniedError | EntityNotFoundError>>
}

export interface SearchIndexPermissionService {
  ensureSearchIndexAllPermission(context: AppRequestContext): Promise<PermissionDeniedError | null>
  ensureSearchIndexEventPermission(context: AppRequestContext): Promise<PermissionDeniedError | null>
}

export interface IndexEventObservations {
  (event: MageEventAttrs, force?: boolean): Promise<void>
}
