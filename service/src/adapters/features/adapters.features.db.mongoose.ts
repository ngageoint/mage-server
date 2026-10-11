import mongoose from 'mongoose'

/**
 * Mongoose adapter for layer Features
 */

const Schema = mongoose.Schema

export interface FeatureDocument {
  type: string
  geometry: any
  properties: any
}

export type FeatureModel = mongoose.Model<FeatureDocument>

export const FeatureSchema = new Schema<FeatureDocument, FeatureModel>(
  {
    type: { type: String, required: true },
    geometry: Schema.Types.Mixed,
    properties: Schema.Types.Mixed
  },
  {
    strict: false,
    versionKey: false,
    minimize: false
  }
)

FeatureSchema.index({ geometry: '2dsphere' })

function transform(_doc: any, ret: any): any {
  ret.id = ret._id
  delete ret._id
  return ret
}

FeatureSchema.set('toJSON', { transform })

export function FeatureModel(conn: mongoose.Connection, collectionName: string): FeatureModel {
  return (conn.models[collectionName] as FeatureModel) || conn.model<FeatureDocument, FeatureModel>(collectionName, FeatureSchema, collectionName)
}

export interface FeatureRepository {
  findAll(): Promise<mongoose.HydratedDocument<FeatureDocument>[]>
  createMany(features: Partial<FeatureDocument>[]): Promise<mongoose.HydratedDocument<FeatureDocument>[]>
}

export class MongooseFeatureRepository implements FeatureRepository {

  constructor(private readonly model: FeatureModel) {}

  async findAll(): Promise<mongoose.HydratedDocument<FeatureDocument>[]> {
    return this.model.find({}).exec()
  }

  async createMany(features: Partial<FeatureDocument>[]): Promise<mongoose.HydratedDocument<FeatureDocument>[]> {
    const stubs = features.map(feature => ({ ...feature, properties: feature.properties || {} }))
    return this.model.create(stubs)
  }
}
