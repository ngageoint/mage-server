import { EventEmitter } from 'events'
import { UserLocationDomainEventType } from '../../entities/locations/entities.locations'
import { MageEventsPluginHooks } from '../../plugins.api/plugins.api.events'

export const loadMageEventsHoooks = async (moduleName: string, hooks: MageEventsPluginHooks, domainEvents: EventEmitter) => {
  const { mageEvent } = hooks
  if (!mageEvent) {
    return
  }
  if (typeof mageEvent.onUserLocations === 'function') {
    domainEvents.on(UserLocationDomainEventType.LocationSaved, mageEvent.onUserLocations)
  }
}