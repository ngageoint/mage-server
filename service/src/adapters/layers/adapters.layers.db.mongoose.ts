import mongoose from 'mongoose'
import { SequenceRepository } from '../../entities/entities.global'

const Schema = mongoose.Schema

export const LayerModelName = 'Layer'

export interface LayerDocument {
  _id: number
  name: string
  description?: string
  state: 'available' | 'unavailable' | 'processing'
  type: string
  // Feature
  collectionName?: string
  // Imagery
  url?: string
  base?: boolean
  format?: string
  wms?: {
    layers?: string
    styles?: string
    format?: string
    transparent?: boolean
    version?: string
  }
  // GeoPackage
  file?: {
    name?: string
    contentType?: string
    size?: string
    relativePath?: string
  }
  tables?: {
    name?: string
    type?: 'tile' | 'feature'
    minZoom?: number
    maxZoom?: number
    bbox?: number[]
  }[]
  invalid?: { errors: any[] }
  processing?: {
    count?: number
    total?: number
    description?: string
    layer: string
    type?: 'tile' | 'feature'
    complete?: boolean
  }[]
}

export type LayerModel = mongoose.Model<LayerDocument>

export const LayerSchema = new Schema<LayerDocument, LayerModel>(
  {
    _id: { type: Number, required: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    state: { type: String, required: true, enum: ['available', 'unavailable', 'processing'] },
  },
  {
    discriminatorKey: 'type',
  },
)

const ImagerySchema = new Schema({
  url: { type: String, required: false },
  base: { type: Boolean, required: false },
  format: { type: String, required: false },
  wms: {
    layers: { type: String },
    styles: { type: String },
    format: { type: String },
    transparent: { type: Boolean },
    version: { type: String },
  },
})

const FeatureLayerSchema = new Schema({
  collectionName: { type: String, required: false },
})

const GeoPackageSchema = new Schema({
  file: {
    name: { type: String, required: false },
    contentType: { type: String, required: false },
    size: { type: String, required: false },
    relativePath: { type: String, required: false },
  },
  tables: [
    {
      _id: false,
      name: { type: String },
      type: { type: String, enum: ['tile', 'feature'] },
      minZoom: { type: Number },
      maxZoom: { type: Number },
      bbox: [
        {
          type: Number,
        },
      ],
    },
  ],
  invalid: {
    type: {
      errors: [Schema.Types.Mixed],
    },
    default: undefined,
  },
  processing: {
    type: [
      {
        _id: false,
        count: { type: Number, required: false },
        total: { type: Number, required: false },
        description: { type: String, required: false },
        layer: { type: String, required: true },
        type: { type: String, enum: ['tile', 'feature'] },
        complete: { type: Boolean },
      },
    ],
    default: undefined,
  },
})

function transform(_layer: any, ret: any, options: any): any {
  ret.id = ret._id
  delete ret._id
  delete ret.collectionName
  const path = options.path || ''
  if (ret.type === 'Feature') ret.url = path
  return ret
}

LayerSchema.set('toObject', { transform })
LayerSchema.set('toJSON', { transform })

export function LayerModel(conn: mongoose.Connection): LayerModel {
  const model = (conn.models[LayerModelName] as LayerModel) || conn.model<LayerDocument, LayerModel>(LayerModelName, LayerSchema)
  if (!model.discriminators?.['Imagery']) {
    model.discriminator('Imagery', ImagerySchema)
  }
  if (!model.discriminators?.['Feature']) {
    model.discriminator('Feature', FeatureLayerSchema)
  }
  if (!model.discriminators?.['GeoPackage']) {
    model.discriminator('GeoPackage', GeoPackageSchema)
  }
  return model
}

export interface LayerFilter {
  type?: string
  layerIds?: (string | number)[]
  includeUnavailable?: boolean
}

export interface LayerRepository {
  findMany(filter: LayerFilter): Promise<mongoose.HydratedDocument<LayerDocument>[]>
  count(): Promise<number>
  findById(id: number | string): Promise<mongoose.HydratedDocument<LayerDocument> | null>
  nextLayerId(): Promise<number>
  create(id: number, layer: Partial<LayerDocument>): Promise<mongoose.HydratedDocument<LayerDocument>>
  update(id: number | string, layer: Partial<LayerDocument>): Promise<mongoose.HydratedDocument<LayerDocument> | null>
  remove(layer: mongoose.HydratedDocument<LayerDocument>): Promise<void>
}

/**
 * Removes a deleted layer's id from every event that references it
 */
export interface RemoveLayerFromEvents {
  (layerId: number): Promise<void>
}

export class MongooseLayerRepository implements LayerRepository {

  constructor(
    private readonly model: LayerModel,
    private readonly sequenceRepo: SequenceRepository,
    private readonly removeLayerFromEvents: RemoveLayerFromEvents
  ) {}

  async findMany(filter: LayerFilter): Promise<mongoose.HydratedDocument<LayerDocument>[]> {
    const conditions: any = {}
    if (filter.type) conditions.type = filter.type
    if (filter.layerIds) conditions._id = { $in: filter.layerIds }
    if (!filter.includeUnavailable) {
      conditions.state = { $eq: 'available' }
    }
    return this.model.find(conditions).exec()
  }

  async count(): Promise<number> {
    return this.model.countDocuments({}).exec()
  }

  async findById(id: number | string): Promise<mongoose.HydratedDocument<LayerDocument> | null> {
    return this.model.findById(id).exec()
  }

  async nextLayerId(): Promise<number> {
    return this.sequenceRepo.nextValue('layer')
  }

  async create(id: number, layer: Partial<LayerDocument>): Promise<mongoose.HydratedDocument<LayerDocument>> {
    (layer as any)._id = id
    return this.model.create(layer)
  }

  async update(id: number | string, layer: Partial<LayerDocument>): Promise<mongoose.HydratedDocument<LayerDocument> | null> {
    let model: LayerModel = this.model
    const discriminators = this.model.discriminators as Record<string, LayerModel> | undefined
    if (layer.type && discriminators?.[layer.type]) {
      model = discriminators[layer.type]
    }
    return model.findByIdAndUpdate(id, layer, { returnDocument: 'after' }).exec()
  }

  async remove(layer: mongoose.HydratedDocument<LayerDocument>): Promise<void> {
    await this.removeLayerFromEvents(layer._id)
    await layer.deleteOne()
  }
}
