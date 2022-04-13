import { Feature, Point } from 'geojson'
import { InjectionToken } from '.'
import { MageEventAttrs, MageEventRepository } from '../entities/events/entities.events'
import { User } from '../entities/users/entities.users'


export interface UserLocation extends Feature<Point> {
  properties: Feature['properties'] & {
    timestamp: Date
  }
  // TODO: evaluate the rest of the properties for locations including
  // teamIds and deviceId
}

export interface MageEventsPluginHooks {
  mageEvent?: {
    /**
     * MAGE calls this hook after persisting a user's reported location.
     *
     * TODO: Evaluate whether this goes here to associate with MAGE events
     * along with observations or somewhere else.  The reason for this
     * placement intially is that user locations and observations only exist in
     * the context of an event.
     */
    onUserLocations?: (locations: UserLocation[], user: User, event: MageEventAttrs) => any
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