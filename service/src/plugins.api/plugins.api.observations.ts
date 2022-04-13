import { InjectionToken } from '.'
import { ObservationRepositoryForEvent } from '../entities/observations/entities.observations'


/**
 * Use this token to request the function that can retrieve an event-scoped
 * observation repository that can find and save observation data for a
 * particular event.
 */
export const ObservationRepositoryToken: InjectionToken<ObservationRepositoryForEvent> = Symbol('InjectObservationRepository')