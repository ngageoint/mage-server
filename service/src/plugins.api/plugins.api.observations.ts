import { InjectionToken } from '.'
import { AttachmentStore, ObservationRepositoryForEvent } from '../entities/observations/entities.observations'


/**
 * Use this token to request the function that can retrieve an event-scoped
 * observation repository that can find and save observation data for a
 * particular event.
 */
export const ObservationRepositoryToken: InjectionToken<ObservationRepositoryForEvent> = Symbol('InjectObservationRepository')
export const AttachmentStoreToken: InjectionToken<AttachmentStore> = Symbol('InjectAttachmentStore')