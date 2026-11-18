import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'

// Tracks observations the CoT builder has already rejected (e.g. non-Point
// geometry), so `TakPushController` doesn't rebuild/reject the same
// observation on every poll tick forever. Deliberately kept separate from
// `TakPushAttrs` - that collection backs the admin UI's "pushed" stats, and
// an ineligible observation was never actually pushed to TAK.
export interface TakPushIneligibleAttrs {
  eventId: MageEventId
  observationId: ObservationId
  lastCheckedAt: Date
}

export interface TakPushIneligibleRepository {
  findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushIneligibleAttrs | null>
  recordIneligible(eventId: MageEventId, observationId: ObservationId, checkedAt: Date): Promise<TakPushIneligibleAttrs>
}
