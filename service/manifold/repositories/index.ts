
import { SourceDescriptor, SourceDescriptorModel, AdapterDescriptorModel, AdapterDescriptor, SourceDescriptorEntity, AdapterDescriptorEntity } from '../models'
import mongoose from 'mongoose'


export type EntityReference = {
  id: any
}


export class BaseRepository<D extends mongoose.Document, M extends mongoose.Model<D>, V> {

  readonly model: M

  constructor(model: M) {
    this.model = model
  }

  async create(attrs: V): Promise<D> {
    return await this.model.create(attrs)
  }

  async readAll(): Promise<D[]> {
    return await this.model.find()
  }

  async findById(id: any): Promise<D | null> {
    return await this.model.findById(id)
  }

  async update(attrs: Partial<V> & EntityReference): Promise<D> {
    const entity = (await this.model.findById(attrs.id!))!
    entity.set(attrs)
    return await entity.save()
  }

  async deleteById(id: any): Promise<void> {
    await this.model.findByIdAndRemove(id)
  }
}


export class AdapterRepository extends BaseRepository<AdapterDescriptorEntity, AdapterDescriptorModel, AdapterDescriptor> {

  constructor(model: AdapterDescriptorModel) {
    super(model)
  }
}


export class SourceRepository extends BaseRepository<SourceDescriptorEntity, SourceDescriptorModel, SourceDescriptor> {

  constructor(model: SourceDescriptorModel) {
    super(model)
  }
}
