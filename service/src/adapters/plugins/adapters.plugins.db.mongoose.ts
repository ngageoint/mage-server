import Mongoose from 'mongoose'
import { EnsureJson } from '../../entities/entities.json_types'
import { PluginStateRepository } from '../../plugins.api'

export type PluginStateDocument<State extends object> = Mongoose.Document & {
  _id: 0,
  state: State
}

const SCHEMA_SPEC = {
  _id: { type: Mongoose.SchemaTypes.String },
  state: { type: Mongoose.SchemaTypes.Mixed, default: null }
}

export class MongoosePluginStateRepository<State extends object> implements PluginStateRepository<State> {

  readonly model: Mongoose.Model<PluginStateDocument<State>>

  constructor(public readonly pluginId: string, public readonly mongoose: Mongoose.Mongoose) {
    const collectionName = `plugin_state_${pluginId}`
    const modelNames = mongoose.modelNames()
    this.model = modelNames.includes(collectionName) ? mongoose.model(collectionName) : mongoose.model(collectionName, new Mongoose.Schema(SCHEMA_SPEC), collectionName)
  }

  async put(state: EnsureJson<State>): Promise<EnsureJson<State>> {
    const updated = await this.model.findByIdAndUpdate(this.pluginId, { state }, { new: true, upsert: true })
    return updated.toJSON().state
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
    const patched = await this.model.findByIdAndUpdate(this.pluginId, update, { new: true, upsert: true })
    return patched.toJSON().state
  }

  async get(): Promise<EnsureJson<State> | null> {
    const doc = await this.model.findById(this.pluginId)
    return doc?.toJSON().state || null
  }
}