import { AddFeedToEvent, AddFeedToEventRequest, ListEventFeeds, ListEventFeedsRequest, UserFeed, RemoveFeedFromEvent, RemoveFeedFromEventRequest } from '../../app.api/events/app.api.events'
import { MageEventRepository, MageEventAttrs } from '../../entities/events/entities.events'
import { entityNotFound } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { FeedRepository, localizedFeed } from '../../entities/feeds/entities.feeds'
import { EventPermissionServiceImpl } from '../../permissions/permissions.events'
import { ContentLanguageKey, LanguageTag } from '../../entities/entities.i18n'

/*
TODO:
create an event request context to avoid redundant fetching of events
between permission checks and proceeding application logic
*/

export function AddFeedToEvent(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository): AddFeedToEvent {
  return async function(req: AddFeedToEventRequest): ReturnType<AddFeedToEvent> {
    let event: MageEventAttrs | null = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error(entityNotFound(req.event, 'MageEvent'))
    }
    // TODO: also check for permission to read the feed?
    const denied = await permissionService.ensureEventUpdatePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    // TODO: maybe should check event is not null ¯\_(ツ)_/¯
    event = await eventRepo.addFeedsToEvent(req.event, req.feed)
    return AppResponse.success<MageEventAttrs, unknown>(event!)
  }
}

export function ListEventFeeds(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository, feedRepo: FeedRepository): ListEventFeeds {
  return async function(req: ListEventFeedsRequest): ReturnType<ListEventFeeds> {
    const event = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error(entityNotFound(req.event, 'MageEvent'))
    }
    const denied = await permissionService.ensureEventReadPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const feeds = await feedRepo.findAllByIds(event.feedIds)
    const langPrefs = req.context.locale()?.languagePreferences || []
    // TODO: is this the right way to return content languages?
    const { userFeeds, langs } = Object.values(feeds).reduce(({ userFeeds, langs }, feed) => {
      if (feed) {
        const { constantParams, ...userFeed } = { ...feed }
        const localized = localizedFeed(userFeed, langPrefs)
        userFeeds.push(localized)
        const lang = localized[ContentLanguageKey]
        if (lang) {
          langs.add(lang.toString())
        }
      }
      return { userFeeds, langs }
    }, { userFeeds: [] as UserFeed[], langs: new Set<string>() })
    return AppResponse.success(userFeeds, Array.from(langs).map(x => new LanguageTag(x)))
  }
}

export function RemoveFeedFromEvent(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository):  RemoveFeedFromEvent {
  return async function(req: RemoveFeedFromEventRequest): ReturnType<RemoveFeedFromEvent> {
    const event = await eventRepo.findById(req.event)
    if (!event) {
      return AppResponse.error(entityNotFound(req.event, 'MageEvent'))
    }
    const denied = await permissionService.ensureEventUpdatePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    if (event.feedIds.indexOf(req.feed) < 0) {
      return AppResponse.error(entityNotFound(req.feed, 'MageEvent.feedIds'))
    }
    const updated = await eventRepo.removeFeedsFromEvent(event.id, req.feed)
    if (updated) {
      return AppResponse.success<MageEventAttrs, unknown>(updated)
    }
    return AppResponse.error(entityNotFound(event.id, 'MageEvent', 'event removed before update'))
  }
}
