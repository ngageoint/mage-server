
import { SourceDescriptor, SourceDescriptorModel, AdapterDescriptorModel, AdapterDescriptor, SourceDescriptorEntity, AdapterDescriptorEntity } from '../models'


export class AdapterRepository {

  readonly model: AdapterDescriptorModel

  constructor(model: AdapterDescriptorModel) {
    this.model = model
  }

  async create(attrs: AdapterDescriptor): Promise<AdapterDescriptorEntity> {
    return await this.model.create(attrs)
  }

  async readAll(): Promise<AdapterDescriptorEntity[]> {
    return await this.model.find()
  }

  async update(attrs: Partial<AdapterDescriptor>): Promise<AdapterDescriptorEntity> {
    const entity = (await this.model.findById(attrs.id!))!
    entity.set(attrs)
    return await entity.save()
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndRemove(id)
  }
}


export class SourceRepository {

  async create(attrs: SourceDescriptor): Promise<SourceDescriptorEntity> {
    throw new Error('unimplemented')
  }

  async readAll(): Promise<SourceDescriptorEntity[]> {
    throw new Error('unimplemented')
  }

  async findById(sourceId: string): Promise<SourceDescriptorEntity | null> {
    throw new Error('unimplemented')
  }

  async update(attrs: Partial<SourceDescriptor>): Promise<SourceDescriptorEntity> {
    throw new Error('unimplemented')
  }

  async delete(attrs: SourceDescriptor): Promise<void> {
    throw new Error('unimplemented')
  }
}
