import { AppRequest, AppResponse } from '../app.api.global'
import { FeedId, Feed } from '../../entities/feeds/entities.feeds'
import { MageEventId, MageEventAttrs } from '../../entities/events/entities.events'
import { EntityNotFoundError, PermissionDeniedError } from '../app.api.errors'
import { Localized } from '../../entities/entities.i18n'

export interface AddFeedToEventRequest extends AppRequest {
  feed: FeedId,
  event: MageEventId
}

export interface AddFeedToEvent {
  (req: AddFeedToEventRequest): Promise<AppResponse<MageEventAttrs, PermissionDeniedError | EntityNotFoundError>>
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
  (req: ListEventFeedsRequest): Promise<AppResponse<Localized<UserFeed>[], PermissionDeniedError | EntityNotFoundError>>
}

export interface RemoveFeedFromEventRequest extends AppRequest {
  event: MageEventId,
  feed: FeedId
}

export interface RemoveFeedFromEvent {
  (req: RemoveFeedFromEventRequest): Promise<AppResponse<MageEventAttrs, PermissionDeniedError | EntityNotFoundError>>
}
