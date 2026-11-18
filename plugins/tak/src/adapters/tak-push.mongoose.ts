import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

const TakPushSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  takUid: { type: String, required: true },
  callsign: { type: String, required: true },
  firstPushedAt: { type: Date, required: true },
  lastSyncedAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

TakPushSchema.index({ eventId: 1, observationId: 1 }, { unique: true })

export interface TakPushAttrs {
  eventId: MageEventId
  observationId: ObservationId
  takUid: string
  callsign: string
  firstPushedAt: Date
  lastSyncedAt: Date
}

export type TakPushDocument = mongoose.Document
export type TakPushMongooseModel = mongoose.Model<TakPushDocument>
const TakPushModelName: string = 'TakPush'

export function TakPushModel(connection: mongoose.Connection, collectionName: string): TakPushMongooseModel {
  return connection.model<TakPushDocument>(TakPushModelName, TakPushSchema, collectionName)
}

export interface TakPushRepository {
  findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushAttrs | null>
  findAllForEvent(eventId: MageEventId): Promise<TakPushAttrs[]>
  findRecentForEvent(eventId: MageEventId, limit: number): Promise<TakPushAttrs[]>
  recordPush(eventId: MageEventId, observationId: ObservationId, takUid: string, syncedAt: Date, callsign: string): Promise<TakPushAttrs>
}

export class MongooseTakPushRepository implements TakPushRepository {
  readonly model: TakPushMongooseModel

  constructor(model: TakPushMongooseModel) {
    this.model = model
  }

  async findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushAttrs | null> {
    const document = await this.model.findOne({ eventId, observationId })
    return document ? toAttrs<TakPushAttrs>(document) : null
  }

  async findAllForEvent(eventId: MageEventId): Promise<TakPushAttrs[]> {
    const documents = await this.model.find({ eventId })
    return documents.map(document => toAttrs<TakPushAttrs>(document))
  }

  async findRecentForEvent(eventId: MageEventId, limit: number): Promise<TakPushAttrs[]> {
    const documents = await this.model.find({ eventId }).sort({ lastSyncedAt: -1 }).limit(limit)
    return documents.map(document => toAttrs<TakPushAttrs>(document))
  }

  async recordPush(eventId: MageEventId, observationId: ObservationId, takUid: string, syncedAt: Date, callsign: string): Promise<TakPushAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId, observationId },
      {
        $set: { takUid, callsign, lastSyncedAt: syncedAt },
        $setOnInsert: { firstPushedAt: syncedAt }
      },
      { upsert: true, new: true }
    )
    return toAttrs<TakPushAttrs>(document!)
  }
}
