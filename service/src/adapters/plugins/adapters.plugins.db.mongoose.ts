import mongoose from 'mongoose'
import { EnsureJson } from '../../entities/entities.json_types'
import { PluginStateRepository } from '../../plugins.api'

export type PluginStateDocument<State extends object> = {
  _id: 'string',
  state: State | null
}

const SCHEMA_SPEC = {
  _id: { type: mongoose.SchemaTypes.String },
  state: { type: mongoose.SchemaTypes.Mixed, default: null }
}

export class MongoosePluginStateRepository<State extends object> implements PluginStateRepository<State> {

  readonly model: mongoose.Model<PluginStateDocument<State>>

  constructor(public readonly pluginId: string, public readonly mongoose: mongoose.Mongoose) {
    const collectionName = `plugin_state_${pluginId}`
    const modelNames = mongoose.modelNames()
    this.model = modelNames.includes(collectionName) ?
      mongoose.model<PluginStateDocument<State>>(collectionName) :
      mongoose.model(collectionName, new mongoose.Schema<PluginStateDocument<State>>(SCHEMA_SPEC), collectionName)
  }

  async put(state: EnsureJson<State> | null): Promise<EnsureJson<State>> {
    const updated = await this.model.findByIdAndUpdate(this.pluginId, { state }, { new: true, upsert: true, setDefaultsOnInsert: false })
    return updated.toJSON().state as any
  }

  async patch(state: Partial<EnsureJson<State>>): Promise<EnsureJson<State>> {
    const update = Object.entries(state).reduce((update, entry) => {
      const stateKey = `state.${entry[0]}`
      if (entry[1] === undefined) {
        update.$unset = { ...update.$unset, [stateKey]: 1 }
      }
      else {
        update.$set = { ...update.$set, [stateKey]: entry[1] }
      }
      return update
    }, {} as any)
    const patched = await this.model.findByIdAndUpdate(this.pluginId, update, { new: true, upsert: true, setDefaultsOnInsert: false })
    return patched.toJSON().state as any
  }

  async get(): Promise<EnsureJson<State> | null> {
    const doc = await this.model.findById(this.pluginId)
    return doc?.toJSON().state as any || null
  }
}