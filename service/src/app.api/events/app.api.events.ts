import { AppRequest, AppResponse } from '../app.api.global'
import { FeedId, Feed, FeedContent } from '../../entities/feeds/entities.feeds'
import { MageEventId, MageEvent } from '../../entities/events/entities.events'
import { EntityNotFoundError, PermissionDeniedError } from '../app.api.errors'

export interface AddFeedToEventRequest extends AppRequest {
  feed: FeedId,
  event: MageEventId
}

export interface AddFeedToEvent {
  (req: AddFeedToEventRequest): Promise<AppResponse<MageEvent, PermissionDeniedError | EntityNotFoundError>>
}

export interface ListEventFeedsRequest extends AppRequest {
  event: MageEventId
}

/**
 * This is a user-facing feed document that omits the constant parameters from
 * the feed entity for security.
 */
export type UserFeed = Omit<Feed, 'constantParams'>

export interface ListEventFeeds {
  (req: ListEventFeedsRequest): Promise<AppResponse<UserFeed[], PermissionDeniedError | EntityNotFoundError>>
}

export interface RemoveFeedFromEventRequest extends AppRequest {
  event: MageEventId,
  feed: FeedId
}

export interface RemoveFeedFromEvent {
  (req: RemoveFeedFromEventRequest): Promise<AppResponse<MageEvent, PermissionDeniedError | EntityNotFoundError>>
}
