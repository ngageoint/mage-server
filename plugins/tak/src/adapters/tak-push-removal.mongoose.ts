import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

// Kept separate from TakPush rather than soft-deleting that record - this
// way pushedCount/findAllForEvent stay simple hard-delete semantics, and a
// later re-push of the same observation (un-archived, edited again) just
// upserts a fresh TakPush row without needing to clear a removal flag.
const TakPushRemovalSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  callsign: { type: String, required: true },
  removedAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

TakPushRemovalSchema.index({ eventId: 1, observationId: 1 }, { unique: true })

export interface TakPushRemovalAttrs {
  eventId: MageEventId
  observationId: ObservationId
  callsign: string
  removedAt: Date
}

export type TakPushRemovalDocument = mongoose.Document
export type TakPushRemovalMongooseModel = mongoose.Model<TakPushRemovalDocument>
const TakPushRemovalModelName: string = 'TakPushRemoval'

export function TakPushRemovalModel(connection: mongoose.Connection, collectionName: string): TakPushRemovalMongooseModel {
  return connection.model<TakPushRemovalDocument>(TakPushRemovalModelName, TakPushRemovalSchema, collectionName)
}

export interface TakPushRemovalRepository {
  recordRemoval(eventId: MageEventId, observationId: ObservationId, callsign: string, removedAt: Date): Promise<TakPushRemovalAttrs>
  findRecentForEvent(eventId: MageEventId, limit: number): Promise<TakPushRemovalAttrs[]>
}

export class MongooseTakPushRemovalRepository implements TakPushRemovalRepository {
  readonly model: TakPushRemovalMongooseModel

  constructor(model: TakPushRemovalMongooseModel) {
    this.model = model
  }

  async recordRemoval(eventId: MageEventId, observationId: ObservationId, callsign: string, removedAt: Date): Promise<TakPushRemovalAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId, observationId },
      { $set: { callsign, removedAt } },
      { upsert: true, new: true }
    )
    return toAttrs<TakPushRemovalAttrs>(document!)
  }

  async findRecentForEvent(eventId: MageEventId, limit: number): Promise<TakPushRemovalAttrs[]> {
    const documents = await this.model.find({ eventId }).sort({ removedAt: -1 }).limit(limit)
    return documents.map(document => toAttrs<TakPushRemovalAttrs>(document))
  }
}
