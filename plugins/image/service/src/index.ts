import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { initFromSavedState } from './processor'


/**
 * The MAGE Image Plugin finds images attached to MAGE observations, generates
 * thumbnail previews at configurable sizes, and optionally auto-orients the
 * images by rotating them based on the EXIF orientation tag so all clients
 * display the images correctly.
 */
const imagePluginHooks: InitPluginHook<{ stateRepo: typeof PluginStateRepositoryToken }> = {
  inject: {
    configRepo: PluginStateRepositoryToken
  },
  init: async (services) => {
    console.info('intializing image plugin ...')
    initFromSavedState(services.stateRepo)
  }
}

export = imagePluginHooks

