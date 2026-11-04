import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

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

export interface TakPushSettingsAttrs {
  eventId: MageEventId
  enabled: boolean
  enabledAt?: Date
  locationSharingEnabled: boolean
}

export type TakPushSettingsDocument = mongoose.Document
export type TakPushSettingsMongooseModel = mongoose.Model<TakPushSettingsDocument>
const TakPushSettingsModelName: string = 'TakPushSettings'

export function TakPushSettingsModel(connection: mongoose.Connection, collectionName: string): TakPushSettingsMongooseModel {
  return connection.model<TakPushSettingsDocument>(TakPushSettingsModelName, TakPushSettingsSchema, collectionName)
}

export interface TakPushSettingsRepository {
  isEnabled(eventId: MageEventId): Promise<boolean>
  setEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
  findAllEnabled(): Promise<TakPushSettingsAttrs[]>
  isLocationSharingEnabled(eventId: MageEventId): Promise<boolean>
  setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<TakPushSettingsAttrs>
}

export class MongooseTakPushSettingsRepository implements TakPushSettingsRepository {
  readonly model: TakPushSettingsMongooseModel

  constructor(model: TakPushSettingsMongooseModel) {
    this.model = model
  }

  private async findSettings(eventId: MageEventId): Promise<TakPushSettingsAttrs | null> {
    const document = await this.model.findOne({ eventId })
    return document ? toAttrs<TakPushSettingsAttrs>(document) : null
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
    return toAttrs<TakPushSettingsAttrs>(document!)
  }

  async findAllEnabled(): Promise<TakPushSettingsAttrs[]> {
    const documents = await this.model.find({ enabled: true })
    return documents.map(document => toAttrs<TakPushSettingsAttrs>(document))
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
    return toAttrs<TakPushSettingsAttrs>(document!)
  }
}
