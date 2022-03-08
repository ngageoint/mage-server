
import { FeedServiceType } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'
import { IconPluginHooks, PluginStaticIcon } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.icons'
import * as Random from './random'
import { InitPluginHook } from '@ngageoint/mage.service/lib/plugins.api'

const hooks: InitPluginHook = {
  async init(): Promise<FeedsPluginHooks & IconPluginHooks> {
    return {
      feeds: {
        async loadServiceTypes(): Promise<FeedServiceType[]> {
          return [
            new Random.RandomServiceType()
          ]
        }
      },
      icons: {
        async loadPluginStaticIcons(): Promise<PluginStaticIcon[]> {
          return [
            {
              pluginRelativePath: 'icons/random.png',
              title: 'Random',
              summary: 'Icon for random geo points',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'random.png',
              sizePixels: { width: 60, height: 60 },
              sizeBytes: 1684,
              tags: []
            }
          ]
        }
      }
    }
  }
}

export = hooks