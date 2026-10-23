import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import mongoose from 'mongoose'
import { toAttrs } from './mongoose-helpers'

const AtakPushSettingsSchema = new mongoose.Schema({
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

AtakPushSettingsSchema.index({ eventId: 1 }, { unique: true })

export interface AtakPushSettingsAttrs {
  eventId: MageEventId
  enabled: boolean
  enabledAt?: Date
  locationSharingEnabled: boolean
}

export type AtakPushSettingsDocument = mongoose.Document
export type AtakPushSettingsMongooseModel = mongoose.Model<AtakPushSettingsDocument>
const AtakPushSettingsModelName: string = 'AtakPushSettings'

export function AtakPushSettingsModel(connection: mongoose.Connection, collectionName: string): AtakPushSettingsMongooseModel {
  return connection.model<AtakPushSettingsDocument>(AtakPushSettingsModelName, AtakPushSettingsSchema, collectionName)
}

export interface AtakPushSettingsRepository {
  isEnabled(eventId: MageEventId): Promise<boolean>
  setEnabled(eventId: MageEventId, enabled: boolean): Promise<AtakPushSettingsAttrs>
  findAllEnabled(): Promise<AtakPushSettingsAttrs[]>
  isLocationSharingEnabled(eventId: MageEventId): Promise<boolean>
  setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<AtakPushSettingsAttrs>
}

export class MongooseAtakPushSettingsRepository implements AtakPushSettingsRepository {
  readonly model: AtakPushSettingsMongooseModel

  constructor(model: AtakPushSettingsMongooseModel) {
    this.model = model
  }

  private async findSettings(eventId: MageEventId): Promise<AtakPushSettingsAttrs | null> {
    const document = await this.model.findOne({ eventId })
    return document ? toAttrs<AtakPushSettingsAttrs>(document) : null
  }

  async isEnabled(eventId: MageEventId): Promise<boolean> {
    const attrs = await this.findSettings(eventId)
    return attrs?.enabled ?? false
  }

  async setEnabled(eventId: MageEventId, enabled: boolean): Promise<AtakPushSettingsAttrs> {
    const update: Partial<AtakPushSettingsAttrs> = { eventId, enabled }
    if (enabled) {
      update.enabledAt = new Date()
    }
    const document = await this.model.findOneAndUpdate(
      { eventId },
      { $set: update },
      { upsert: true, new: true }
    )
    return toAttrs<AtakPushSettingsAttrs>(document!)
  }

  async findAllEnabled(): Promise<AtakPushSettingsAttrs[]> {
    const documents = await this.model.find({ enabled: true })
    return documents.map(document => toAttrs<AtakPushSettingsAttrs>(document))
  }

  async isLocationSharingEnabled(eventId: MageEventId): Promise<boolean> {
    const attrs = await this.findSettings(eventId)
    return attrs?.locationSharingEnabled ?? false
  }

  async setLocationSharingEnabled(eventId: MageEventId, enabled: boolean): Promise<AtakPushSettingsAttrs> {
    const document = await this.model.findOneAndUpdate(
      { eventId },
      { $set: { eventId, locationSharingEnabled: enabled } },
      { upsert: true, new: true }
    )
    return toAttrs<AtakPushSettingsAttrs>(document!)
  }
}
