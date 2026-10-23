import { URL } from 'url'
import { MageEvent, MageEventId, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { FeedRepository, FeedServiceRepository, FeedServiceTypeRepository } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { AtakServiceConfig, TakServerServiceType } from '../atak'

export interface ResolvedTakConnection {
  mageEvent: MageEvent
  config: AtakServiceConfig
}

export type TakConnectionResolver = (eventId: MageEventId) => Promise<ResolvedTakConnection | null>

  // Push has no destination of its own to configure - it piggybacks on
  // whichever TAK Server feed the admin already set up for this event's read
  // side. A `Feed`/`FeedService` has no notion of which Event it belongs to;
  // the event is the one holding that link, via `MageEvent.feedIds`. So
  // finding "where do we push this event's observations" means walking
  // event -> feeds -> services and picking the one backed by this plugin's
  // service type.
  //
  // Returns null if the event has no feedIds, none of them resolve to a feed/
  // service, or none of those services is a TAK Server - i.e. there's nothing
  // configured to push to, even if sharing is enabled for the event.
  //
  // Returns the loaded `MageEvent` alongside the config - callers need it
  // anyway (e.g. to resolve `formFor()` while building CoT XML for each
  // observation), and returning it here means they never have to fetch the
  // same event a second time.
  //
  // Note `FeedService.serviceType` holds a server-assigned registration id,
  // not this plugin's own `TakServerServiceType.SERVICE_TYPE_ID` constant -
  // that comparison has to go through `FeedServiceTypeRepository` to get back
  // to the registered type's `pluginServiceTypeId`.

 export async function resolveTakConnection(
  eventId: MageEventId,
  mageEventRepository: MageEventRepository,
  feedRepository: FeedRepository,
  feedServiceRepository: FeedServiceRepository,
  feedServiceTypeRepository: FeedServiceTypeRepository
): Promise<ResolvedTakConnection | null> {
  const mageEvent = await mageEventRepository.findById(eventId)
  if (!mageEvent || mageEvent.feedIds.length === 0) {
    return null
  }
  const feedsById = await feedRepository.findAllByIds(mageEvent.feedIds)
  const serviceIds = new Set(
    Object.values(feedsById)
      .filter((feed): feed is NonNullable<typeof feed> => feed !== null)
      .map(feed => feed.service)
  )
  for (const serviceId of serviceIds) {
    const service = await feedServiceRepository.findById(serviceId)
    if (!service) {
      continue
    }
    const serviceType = await feedServiceTypeRepository.findById(service.serviceType)
    if (serviceType?.pluginServiceTypeId === TakServerServiceType.SERVICE_TYPE_ID) {
      return { mageEvent, config: service.config as unknown as AtakServiceConfig }
    }
  }
  return null
}

// Binds the four feed-resolution repositories once at plugin init, so
// `AtakPushController` only needs one function - it has no other use for
// `FeedRepository`/`FeedServiceRepository`/`FeedServiceTypeRepository`
// beyond resolving an event's TAK connection.
export function createTakConnectionResolver(
  mageEventRepository: MageEventRepository,
  feedRepository: FeedRepository,
  feedServiceRepository: FeedServiceRepository,
  feedServiceTypeRepository: FeedServiceTypeRepository
): TakConnectionResolver {
  return eventId => resolveTakConnection(
    eventId,
    mageEventRepository,
    feedRepository,
    feedServiceRepository,
    feedServiceTypeRepository
  )
}

export interface ResolvedTakSendTarget {
  mageEvent: MageEvent
  host: string
  port: number
}

export type TakSendTargetResolver = (eventId: MageEventId) => Promise<ResolvedTakSendTarget | null>

// AtakPushController and AtakLocationPushController both used to repeat the
// same "resolve the connection, bail if there's no cotPort, parse the
// hostname out of baseUrl" block themselves. Neither has any other use for
// the raw `config` object beyond those two fields, so this does that once.
export function createTakSendTargetResolver(resolveConnection: TakConnectionResolver): TakSendTargetResolver {
  return async eventId => {
    const connection = await resolveConnection(eventId)
    const cotPort = connection?.config.cotPort
    if (!connection || !cotPort) {
      return null
    }
    return {
      mageEvent: connection.mageEvent,
      host: new URL(connection.config.baseUrl).hostname,
      port: cotPort
    }
  }
}
