import { AdapterDescriptor, SourceDescriptor, AdapterDescriptorEntity } from "../models"
import { AdapterRepository, SourceRepository } from "../repositories"
import OgcApiFeatures from "../ogcapi-features"
import { ManifoldAdapter, ManifoldPlugin } from "../adapters"

/**
 * The ManifoldDescriptor contains all the currently available adapters and
 * configured sources, each keyed by their IDs.
 */
export interface ManifoldDescriptor {
  adapters: {
    [adapterId: string]: AdapterDescriptor
  },
  sources: {
    [sourceId: string]: SourceDescriptor
  }
}

export class ManifoldService {

  readonly adapters: {[id: string]: ManifoldAdapter} = {}
  readonly adapterRepo: AdapterRepository
  readonly sourceRepo: SourceRepository

  constructor(adapterRepo: AdapterRepository, sourceRepo: SourceRepository) {
    this.adapterRepo = adapterRepo
    this.sourceRepo = sourceRepo
  }

  async getManifoldDescriptor(): Promise<ManifoldDescriptor> {
    const adapters = await this.adapterRepo.readAll()
    const sources = await this.sourceRepo.readAll()
    const desc: ManifoldDescriptor = {
      adapters: adapters.reduce((prev, curr) => {
        prev[curr.id] = curr.toJSON()
        return prev
      }, {} as { [id: string]: AdapterDescriptor }),
      sources: sources.reduce((prev, curr) => {
        prev[curr.id] = curr.toJSON()
        return prev
      }, {} as { [id: string]: SourceDescriptor })
    }
    return desc
  }

  async getAdapterForSource(source: SourceDescriptor): Promise<ManifoldAdapter> {
    let adapterDesc = source.adapter
    if (typeof adapterDesc === 'string') {
      adapterDesc = (await this.adapterRepo.findById(adapterDesc)) as AdapterDescriptorEntity
    }
    const path = adapterDesc.modulePath
    if (!adapterDesc.id) {
      throw new Error(`adapter descriptor titled ${adapterDesc.title} has no id for source titled ${source.title}, id ${source.id}`)
    }
    let adapter = this.adapters[adapterDesc.id!]
    if (!adapter) {
      // TODO: this should be retrieved from an injected plugin manager or
      // some such concept later after creating the new plugin loading system.
      // maybe this method will even go away entirely if manifold adapters are
      // one of many well-defined plugin hooks
      const plugin = require(path) as ManifoldPlugin
      adapter = await plugin.createAdapter()
      this.adapters[adapterDesc.id!] = adapter
    }
    return adapter
  }
}

