import { AddFeedToEvent, AddFeedToEventRequest, ListEventFeeds, ListEventFeedsRequest, UserFeed, RemoveFeedFromEvent, RemoveFeedFromEventRequest } from '../../app.api/events/app.api.events'
import { EventAccessType, MageEventRepository, MageEventAttrs } from '../../entities/events/entities.events'
import { MageEventPermission } from '../../entities/authorization/entities.permissions'
import { entityNotFound } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { FeedRepository, localizedFeed } from '../../entities/feeds/entities.feeds'
import { EventPermissionServiceImpl } from '../../permissions/permissions.events'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { ContentLanguageKey, LanguageTag } from '../../entities/entities.i18n'

export function AddFeedToEvent(permissionService: EventPermissionServiceImpl, eventRepo: MageEventRepository): AddFeedToEvent {
  return async function(req: AddFeedToEventRequest): ReturnType<AddFeedToEvent> {
    const event = req.context.mageEvent
    // TODO: also check for permission to read the feed?
    const principal = req.context.requestingPrincipal() as UserWithRole
    const denied = await permissionService.authorizeEventAccess(event, principal, MageEventPermission.UPDATE_EVENT, EventAccessType.Update)
    if (denied) {
      return AppResponse.error(denied)
    }
    const updated = await eventRepo.addFeedsToEvent(event.id, req.feed)
    if (updated) {
      return AppResponse.success<MageEventAttrs, unknown>(updated)
    }
    return AppResponse.error(entityNotFound(event.id, 'MageEvent', 'event removed before update'))
  }
}

export function ListEventFeeds(permissionService: EventPermissionServiceImpl, feedRepo: FeedRepository): ListEventFeeds {
  return async function(req: ListEventFeedsRequest): ReturnType<ListEventFeeds> {
    const event = req.context.mageEvent
    const principal = req.context.requestingPrincipal() as UserWithRole
    const denied = await permissionService.authorizeEventAccess(event, principal, MageEventPermission.READ_EVENT_USER, EventAccessType.Read)
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
    const event = req.context.mageEvent
    const principal = req.context.requestingPrincipal() as UserWithRole
    const denied = await permissionService.authorizeEventAccess(event, principal, MageEventPermission.UPDATE_EVENT, EventAccessType.Update)
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
