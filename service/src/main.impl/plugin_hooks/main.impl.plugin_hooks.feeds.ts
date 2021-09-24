import { FeedServiceTypeRepository } from '../../entities/feeds/entities.feeds'
import { FeedsPluginHooks } from '../../plugins.api/plugins.api.feeds'


export async function loadFeedsHooks(moduleName: string, hooks: Partial<FeedsPluginHooks>, serviceTypeRepo: FeedServiceTypeRepository): Promise<void> {
  if (!(hooks?.feeds?.loadServiceTypes instanceof Function)) {
    return
  }
  const serviceTypes = await hooks.feeds.loadServiceTypes()
  for (const serviceType of serviceTypes) {
    serviceTypeRepo.register(moduleName, serviceType)
  }
}
