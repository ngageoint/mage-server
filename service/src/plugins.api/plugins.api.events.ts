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
     * TODO: make it so
     */
    // onObservation?: (event: MageEvent, observation: Observation) => any
  }
}

export const MageEventRepositoryToken: InjectionToken<MageEventRepository> = Symbol('InjectMageEventRepository')