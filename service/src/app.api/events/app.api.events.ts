import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { FeedId, Feed } from '../../entities/feeds/entities.feeds'
import { MageEvent, MageEventAttrs } from '../../entities/events/entities.events'
import { EntityNotFoundError, PermissionDeniedError } from '../app.api.errors'
import { Localized } from '../../entities/entities.i18n'

export interface EventRequestContext<Principal = unknown> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
}

export interface EventRequest<Principal = unknown> extends AppRequest<Principal, EventRequestContext<Principal>> {}

export interface AddFeedToEventRequest extends EventRequest {
  feed: FeedId
}

export interface AddFeedToEvent {
  (req: AddFeedToEventRequest): Promise<AppResponse<MageEventAttrs, PermissionDeniedError | EntityNotFoundError>>
}

export interface ListEventFeedsRequest extends EventRequest {}

/**
 * This is a user-facing feed document that omits the constant parameters from
 * the feed entity for security.
 */
export type UserFeed = Omit<Feed, 'constantParams'>

export interface ListEventFeeds {
  (req: ListEventFeedsRequest): Promise<AppResponse<Localized<UserFeed>[], PermissionDeniedError | EntityNotFoundError>>
}

export interface RemoveFeedFromEventRequest extends EventRequest {
  feed: FeedId
}

export interface RemoveFeedFromEvent {
  (req: RemoveFeedFromEventRequest): Promise<AppResponse<MageEventAttrs, PermissionDeniedError | EntityNotFoundError>>
}
