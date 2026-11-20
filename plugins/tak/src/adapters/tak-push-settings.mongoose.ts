import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import mongoose from 'mongoose'
import { TakPushSettingsAttrs, TakPushSettingsRepository } from '../entities/tak-push-settings'

const TakPushSettingsSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  // Defaulted (not just required) so either toggle's upsert can create this
  // document first - `locationSharingEnabled` can be set before `enabled`
  // ever has been, or vice versa.
  enabled: { type: Boolean, required: true, default: false },
  enabledAt: { type: Date, required: false },
  // Separate from `enabled` (observation sharing) rather than a dependent
  // flag - a continuous live position feed is a materially bigger privacy
  // footprint than a deliberately-submitted observation, so turning one on
  // must never silently turn on the other. Defaults off.
  locationSharingEnabled: { type: Boolean, required: true, default: false }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
})

TakPushSettingsSchema.index({ eventId: 1 }, { unique: true })

export type TakPushSettingsMongooseModel = mongoose.Model<TakPushSettingsAttrs>
const TakPushSettingsModelName: string = 'TakPushSettings'

export function TakPushSettingsModel(connection: mongoose.Connection, collectionName: string): TakPushSettingsMongooseModel {
  return connection.model<TakPushSettingsAttrs>(TakPushSettingsModelName, TakPushSettingsSchema, collectionName)
}

export class MongooseTakPushSettingsRepository implements TakPushSettingsRepository {
  readonly model: TakPushSettingsMongooseModel

  constructor(model: TakPushSettingsMongooseModel) {
    this.model = model
  }

  private async findSettings(eventId: MageEventId): Promise<TakPushSettingsAttrs | null> {
    return await this.model.findOne({ eventId })
  }

  async isEnabled(eventId: MageEventId): Promise<boolean> {
    const attrs = await this.findSettings(eventId)
    return attrs?.enabled ?? false
  }

  async setEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs> {
    const update: Partial<TakPushSettingsAttrs> = { eventId, enabled }
    if (enabled) {
      update.enabledAt = new Date()
    }
    const document = await this.model.findOneAndUpdate(
      { eventId },
      { $set: update },
      { upsert: true, new: true }
    )
    return document!
  }

  async findAllEnabled(): Promise<TakPushSettingsAttrs[]> {
    return await this.model.find({ enabled: true })
  }

  async isLocationSharingEnabled(eventId: MageEventId): Promise<boolean> {
    const attrs = await this.findSettings(eventId)
    return attrs?.locationSharingEnabled ?? false
  }

  async setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId },
      { $set: { eventId, locationSharingEnabled: enabled } },
      { upsert: true, new: true }
    )
    return document!
  }
}
