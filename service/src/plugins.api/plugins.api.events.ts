import { InjectionToken } from '.'
import { MageEventRepository } from '../entities/events/entities.events'
import { UserLocationSavedDomainEvent } from '../entities/locations/entities.locations'

export interface MageEventsPluginHooks {
  mageEvent?: {
    /**
     * MAGE calls this hook after persisting a user's reported location(s).
     */
    onUserLocations?: (event: UserLocationSavedDomainEvent) => any
    /**
     * MAGE calls this hook after persisting a valid observation, new or
     * updated.
     *
     * TODO: not yet implemented. Needed for a plugin to react to observation
     * changes in real time (e.g. an ATAK push-to-TAK feature re-syncing an
     * already-pushed observation on edit) and likely useful to other plugins
     * with the same need. Implement the same way as onUserLocations: wire
     * ObservationDomainEventType.ObservationSaved through
     * loadMageEventsHoooks in main.impl.plugin_hooks.events.ts.
     */
    // onObservation?: (event: MageEvent, observation: Observation) => any
  }
}

export const MageEventRepositoryToken: InjectionToken<MageEventRepository> = Symbol('InjectMageEventRepository')