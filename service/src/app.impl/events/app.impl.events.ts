import { AddFeedToEvent, AddFeedToEventRequest, ListEventFeeds, ListEventFeedsRequest, UserFeed, RemoveFeedFromEvent, RemoveFeedFromEventRequest } from '../../app.api/events/app.api.events'
import { MageEventRepository, MageEvent } from '../../entities/events/entities.events'
import { entityNotFound, EntityNotFoundError, PermissionDeniedError, permissionDenied } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { Feed, FeedRepository } from '../../entities/feeds/entities.feeds'
import { EventPermissionServiceImpl } from '../../permissions/permissions.events'

/*
TODO:
create an event request context to avoid redundant fetching of events
between permission checks and proceeding application logic
*/

export function AddFeedToEvent(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository): AddFeedToEvent {
  return async function(req: AddFeedToEventRequest): ReturnType<AddFeedToEvent> {
    let event = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error<MageEvent, EntityNotFoundError>(entityNotFound(req.event, 'MageEvent'))
    }
    // TODO: also check for permission to read the feed?
    const denied = await permissionService.ensureEventUpdatePermission(req.context)
    if (denied) {
      return AppResponse.error<MageEvent, PermissionDeniedError>(denied)
    }
    event = await eventRepo.addFeedsToEvent(req.event, req.feed)
    return AppResponse.success<MageEvent, unknown>(event!)
  }
}

export function ListEventFeeds(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository, feedRepo: FeedRepository): ListEventFeeds {
  return async function(req: ListEventFeedsRequest): ReturnType<ListEventFeeds> {
    const event = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error<UserFeed[], EntityNotFoundError>(entityNotFound(req.event, 'MageEvent'))
    }
    const denied = await permissionService.ensureEventReadPermission(req.context)
    if (denied) {
      return AppResponse.error<UserFeed[], PermissionDeniedError>(denied)
    }
    const feeds = await feedRepo.findAllByIds(event.feedIds)
    const userFeeds = [] as Feed[]
    Object.values(feeds).forEach(x => {
      if (!x) {
        return
      }
      const userFeed = { ...x }
      delete userFeed['constantParams']
      userFeeds.push(userFeed)
    })
    return AppResponse.success(userFeeds)
  }
}

export function RemoveFeedFromEvent(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository):  RemoveFeedFromEvent {
  return async function(req: RemoveFeedFromEventRequest): ReturnType<RemoveFeedFromEvent> {
    const event = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error<MageEvent, EntityNotFoundError>(entityNotFound(req.event, 'MageEvent'))
    }
    const denied = await permissionService.ensureEventUpdatePermission(req.context)
    if (denied) {
      return AppResponse.error<MageEvent, PermissionDeniedError>(denied)
    }
    if (event.feedIds.indexOf(req.feed) < 0) {
      return AppResponse.error<MageEvent, EntityNotFoundError>(entityNotFound(req.feed, 'MageEvent.feedIds'))
    }
    const updated = await eventRepo.removeFeedsFromEvent(event.id, req.feed)
    if (updated) {
      return AppResponse.success<MageEvent, unknown>(updated)
    }
    return AppResponse.error<MageEvent, EntityNotFoundError>(entityNotFound(event.id, 'MageEvent', 'event removed before update'))
  }
}
