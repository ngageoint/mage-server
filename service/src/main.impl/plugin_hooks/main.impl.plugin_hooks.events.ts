import { EventEmitter } from 'events'
import { UserLocationDomainEventType } from '../../entities/locations/entities.locations'
import { ObservationDomainEventType } from '../../entities/observations/entities.observations'
import { MageEventsPluginHooks } from '../../plugins.api/plugins.api.events'

const guardHook = <Event>(moduleName: string, hook: (event: Event) => any) => async (event: Event) => {
  try {
    await hook(event)
  }
  catch (err) {
    console.error(`error in mage event hook of plugin ${moduleName}:`, err)
  }
}

export const loadMageEventsHoooks = async (moduleName: string, hooks: MageEventsPluginHooks, domainEvents: EventEmitter) => {
  const { mageEvent } = hooks
  if (!mageEvent) {
    return
  }
  if (typeof mageEvent.onUserLocations === 'function') {
    domainEvents.on(UserLocationDomainEventType.LocationSaved, guardHook(moduleName, mageEvent.onUserLocations))
  }
  if (typeof mageEvent.onObservation === 'function') {
    domainEvents.on(ObservationDomainEventType.ObservationSaved, guardHook(moduleName, mageEvent.onObservation))
  }
}