import { AdapterDescriptor, SourceDescriptor } from "../models"
import { AdapterRepository, SourceRepository } from "../repositories"


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
}
