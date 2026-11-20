import { InjectionToken } from '.'
import { MageEventRepository } from '../entities/events/entities.events'
import { UserLocationSavedDomainEvent } from '../entities/locations/entities.locations'
import { ObservationEmitted, ObservationSavedDomainEvent } from '../entities/observations/entities.observations'

export interface MageEventsPluginHooks {
  mageEvent?: {
    /**
     * MAGE calls this hook after persisting a user's reported location(s).
     */
    onUserLocations?: (event: UserLocationSavedDomainEvent) => any
    /**
     * MAGE calls this hook after persisting a valid observation, new or
     * updated.
     */
    onObservation?: (event: ObservationEmitted<ObservationSavedDomainEvent>) => any
  }
}

export const MageEventRepositoryToken: InjectionToken<MageEventRepository> = Symbol('InjectMageEventRepository')