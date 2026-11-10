import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import mongoose from 'mongoose'
import { TakPushIneligibleAttrs, TakPushIneligibleRepository } from '../entities/tak-push-ineligible'

const TakPushIneligibleSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  lastCheckedAt: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

TakPushIneligibleSchema.index({ eventId: 1, observationId: 1 }, { unique: true })

export type TakPushIneligibleMongooseModel = mongoose.Model<TakPushIneligibleAttrs>
const TakPushIneligibleModelName: string = 'TakPushIneligible'

export function TakPushIneligibleModel(connection: mongoose.Connection, collectionName: string): TakPushIneligibleMongooseModel {
  return connection.model<TakPushIneligibleAttrs>(TakPushIneligibleModelName, TakPushIneligibleSchema, collectionName)
}

export class MongooseTakPushIneligibleRepository implements TakPushIneligibleRepository {
  readonly model: TakPushIneligibleMongooseModel

  constructor(model: TakPushIneligibleMongooseModel) {
    this.model = model
  }

  async findByObservation(eventId: MageEventId, observationId: ObservationId): Promise<TakPushIneligibleAttrs | null> {
    return await this.model.findOne({ eventId, observationId })
  }

  async recordIneligible(eventId: MageEventId, observationId: ObservationId, checkedAt: Date): Promise<TakPushIneligibleAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId, observationId },
      { $set: { lastCheckedAt: checkedAt } },
      { upsert: true, new: true }
    )
    return document!
  }
}
