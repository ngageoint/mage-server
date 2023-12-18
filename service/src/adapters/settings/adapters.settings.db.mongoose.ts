import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import * as legacy from '../../models/setting'
import _ from 'lodash'
import mongoose from 'mongoose'
import { MapSettings, SettingRepository } from '../../entities/settings/entities.settings'

export type SettingsDocument = legacy.SettingsDocument
export type SettingsModel = mongoose.Model<SettingsDocument>
export const SettingsSchema = legacy.Model.schema

export class MongooseSettingsRepository extends BaseMongooseRepository<SettingsDocument, SettingsModel, MapSettings> implements SettingRepository {

  constructor(model: mongoose.Model<SettingsDocument>) {
    super(model, {
      docToEntity: doc => {
        const json = doc.toJSON()
        return {
          ...json
        }
      }
    })
  }

  async getMapSettings(): Promise<MapSettings | null> {
    const document = await this.model.findOne({ type: 'map' })
    return document?.settings
  }

  async updateMapSettings(settings: MapSettings): Promise<MapSettings | null> {
    const document = await this.model.findOneAndUpdate({ type: 'map' }, { settings }, { new: true, upsert: true })
    return document?.settings
  }
}