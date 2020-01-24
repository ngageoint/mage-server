
import mongoose, { Model, SchemaOptions } from 'mongoose'

/**
 * An AdapterDescriptor represents a type of data source and the translation
 * from that data source type's data to data that MAGE can understand, and vice
 * versa.
 */
export interface AdapterDescriptor {
  id?: string
  title: string
  description: string
  isReadable: boolean
  isWritable: boolean
  libPath: string
}

/**
 * A SourceDescriptor represents an actual data endpoint whose data a
 * corresponding [[AdapterDescriptor|adapter]] can retrieve and transform.
 */
export interface SourceDescriptor {
  id?: string
  adapter: string | AdapterDescriptor
  title: string
  description: string
  isReadable: boolean
  isWritable: boolean
  url: string
}

export const ManifoldModels = {
  AdapterDescriptor: 'AdapterDescriptor',
  SourceDescriptor: 'SourceDescriptor'
}

const AdapterDescriptorSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: false },
    isReadable: { type: Boolean, required: false, default: true },
    isWritable: { type: Boolean, required: false, default: false },
    libPath: { type: String, require: true }
  },
  {
    toJSON: {
      getters: true,
      transform: (entity: AdapterDescriptorEntity, json: any & AdapterDescriptor, options: SchemaOptions) => {
        delete json._id
        delete json.libPath
      }
    }
  })

const SourceDescriptorSchema = new mongoose.Schema(
  {
    adapter: { type: mongoose.SchemaTypes.ObjectId, required: true, ref: ManifoldModels.AdapterDescriptor },
    title: { type: String, required: true },
    description: { type: String, required: false },
    url: { type: String, required: false },
    isReadable: { type: Boolean, required: false, default: true },
    isWritable: { type: Boolean, required: false, default: false },
  },
  {
    toJSON: {
      getters: true,
      transform: (entity: SourceDescriptorEntity, json: any & SourceDescriptor, options: SchemaOptions) => {
        delete json._id
        if (!entity.populated('adapter') && entity.adapter instanceof mongoose.Types.ObjectId) {
          json.adapter = json.adapter.toHexString()
        }
      }
    }
  })

export type AdapterDescriptorEntity = AdapterDescriptor & mongoose.Document
export type SourceDescriptorEntity = SourceDescriptor & mongoose.Document
export const AdapterDescriptorModel: Model<AdapterDescriptorEntity> = mongoose.model<AdapterDescriptorEntity>(ManifoldModels.AdapterDescriptor, AdapterDescriptorSchema)
export type AdapterDescriptorModel = Model<AdapterDescriptorEntity>
export const SourceDescriptorModel: Model<SourceDescriptorEntity> = mongoose.model<SourceDescriptorEntity>(ManifoldModels.SourceDescriptor, SourceDescriptorSchema)
export type SourceDescriptorModel = Model<SourceDescriptorEntity>
