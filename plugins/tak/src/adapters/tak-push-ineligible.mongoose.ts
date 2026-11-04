import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

// Tracks observations the CoT builder has already rejected (e.g. non-Point
// geometry), so `TakPushController` doesn't rebuild/reject the same
// observation on every poll tick forever. Deliberately kept separate from
// `TakPushModel` - that collection backs the admin UI's "pushed" stats, and
// an ineligible observation was never actually pushed to TAK.
const TakPushIneligibleSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  lastCheckedAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

TakPushIneligibleSchema.index({ eventId: 1, observationId: 1 }, { unique: true })

export interface TakPushIneligibleAttrs {
  eventId: MageEventId
  observationId: ObservationId
  lastCheckedAt: Date
}

export type TakPushIneligibleDocument = mongoose.Document
export type TakPushIneligibleMongooseModel = mongoose.Model<TakPushIneligibleDocument>
const TakPushIneligibleModelName: string = 'TakPushIneligible'

export function TakPushIneligibleModel(connection: mongoose.Connection, collectionName: string): TakPushIneligibleMongooseModel {
  return connection.model<TakPushIneligibleDocument>(TakPushIneligibleModelName, TakPushIneligibleSchema, collectionName)
}

export interface TakPushIneligibleRepository {
  findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushIneligibleAttrs | null>
  recordIneligible(eventId: MageEventId, observationId: ObservationId, checkedAt: Date): Promise<TakPushIneligibleAttrs>
}

export class MongooseTakPushIneligibleRepository implements TakPushIneligibleRepository {
  readonly model: TakPushIneligibleMongooseModel

  constructor(model: TakPushIneligibleMongooseModel) {
    this.model = model
  }

  async findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushIneligibleAttrs | null> {
    const document = await this.model.findOne({ eventId, observationId })
    return document ? toAttrs<TakPushIneligibleAttrs>(document) : null
  }

  async recordIneligible(eventId: MageEventId, observationId: ObservationId, checkedAt: Date): Promise<TakPushIneligibleAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId, observationId },
      { $set: { lastCheckedAt: checkedAt } },
      { upsert: true, new: true }
    )
    return toAttrs<TakPushIneligibleAttrs>(document!)
  }
}
