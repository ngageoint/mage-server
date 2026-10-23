import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

const AtakPushSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  takUid: { type: String, required: true },
  callsign: { type: String, required: true },
  firstPushedAt: { type: Date, required: true },
  lastSyncedAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

AtakPushSchema.index({ eventId: 1, observationId: 1 }, { unique: true })

export interface AtakPushAttrs {
  eventId: MageEventId
  observationId: ObservationId
  takUid: string
  callsign: string
  firstPushedAt: Date
  lastSyncedAt: Date
}

export type AtakPushDocument = mongoose.Document
export type AtakPushMongooseModel = mongoose.Model<AtakPushDocument>
const AtakPushModelName: string = 'AtakPush'

export function AtakPushModel(connection: mongoose.Connection, collectionName: string): AtakPushMongooseModel {
  return connection.model<AtakPushDocument>(AtakPushModelName, AtakPushSchema, collectionName)
}

export interface AtakPushRepository {
  findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<AtakPushAttrs | null>
  findAllForEvent(eventId: MageEventId): Promise<AtakPushAttrs[]>
  findRecentForEvent(eventId: MageEventId, limit: number): Promise<AtakPushAttrs[]>
  recordPush(eventId: MageEventId, observationId: ObservationId, takUid: string, syncedAt: Date, callsign: string): Promise<AtakPushAttrs>
}

export class MongooseAtakPushRepository implements AtakPushRepository {
  readonly model: AtakPushMongooseModel

  constructor(model: AtakPushMongooseModel) {
    this.model = model
  }

  async findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<AtakPushAttrs | null> {
    const document = await this.model.findOne({ eventId, observationId })
    return document ? toAttrs<AtakPushAttrs>(document) : null
  }

  async findAllForEvent(eventId: MageEventId): Promise<AtakPushAttrs[]> {
    const documents = await this.model.find({ eventId })
    return documents.map(document => toAttrs<AtakPushAttrs>(document))
  }

  async findRecentForEvent(eventId: MageEventId, limit: number): Promise<AtakPushAttrs[]> {
    const documents = await this.model.find({ eventId }).sort({ lastSyncedAt: -1 }).limit(limit)
    return documents.map(document => toAttrs<AtakPushAttrs>(document))
  }

  async recordPush(eventId: MageEventId, observationId: ObservationId, takUid: string, syncedAt: Date, callsign: string): Promise<AtakPushAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId, observationId },
      {
        $set: { takUid, callsign, lastSyncedAt: syncedAt },
        $setOnInsert: { firstPushedAt: syncedAt }
      },
      { upsert: true, new: true }
    )
    return toAttrs<AtakPushAttrs>(document!)
  }
}
