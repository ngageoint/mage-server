import { Point } from 'geojson'
import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { UserId } from '@ngageoint/mage.service/lib/entities/users/entities.users'

/**
 * Hand-declared rather than imported from @ngageoint/mage.service's own
 * plugins.api.events/entities.locations types - the installed package
 * (6.7.0) is stale relative to this monorepo's actual service/src, same gap
 * already hit with EventScopedObservationRepository. The installed package's
 * MageEventsPluginHooks.mageEvent.onUserLocations is still typed as
 * `(locations, user, event) => any`; the real running server (built from
 * this monorepo's service/src, not the published package) emits a single
 * UserLocationSavedDomainEvent object instead - confirmed by reading
 * service/src/entities/locations/entities.locations.ts and the real
 * `domainEvents.emit(...)` call in service/src/app.impl/locations/
 * app.impl.locations.ts directly, not just the type declarations.
 */
export interface UserLocation {
  userId: UserId
  eventId: MageEventId
  geometry: Point
  properties: {
    timestamp: Date
    speed?: number
    bearing?: number
    battery_level?: number
    altitude?: number
    accuracy?: number
  }
}

export interface UserLocationSavedDomainEvent {
  readonly locations: UserLocation[]
}
