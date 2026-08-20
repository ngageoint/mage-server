import { EventEmitter } from 'events'
import { LocationsAddedEvent, UserLocation } from '../../entities/locations/entities.locations'
import { MageEventAttrs } from '../../entities/events/entities.events'
import { User } from '../../entities/users/entities.users'
import { MageEventsPluginHooks } from '../../plugins.api/plugins.api.events'

export const loadMageEventsHoooks = async (moduleName: string, hooks: MageEventsPluginHooks, domainEvents: EventEmitter) => {
  const { mageEvent } = hooks
  if (!mageEvent) {
    return
  }
  if (typeof mageEvent.onUserLocations === 'function') {
    const onLocations = mageEvent.onUserLocations
    domainEvents.on(LocationsAddedEvent, (locations: UserLocation[], user: User, event: MageEventAttrs) => {
      onLocations(locations, user, event)
    })
  }
}