
import { FeedServiceType } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'
import { IconPluginHooks, PluginStaticIcon } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.icons'
import * as MSI from './nga-msi'
import { AxiosMsiTransport } from './transport.axios'
import { InitPluginHook } from '@ngageoint/mage.service/lib/plugins.api'

const transport = new AxiosMsiTransport()

const hooks: InitPluginHook = {
  async init(): Promise<FeedsPluginHooks & IconPluginHooks> {
    return {
      feeds: {
        async loadServiceTypes(): Promise<FeedServiceType[]> {
          return [
            new MSI.MsiServiceType(transport)
          ]
        }
      },
      icons: {
        async loadPluginStaticIcons(): Promise<PluginStaticIcon[]> {
          return [
            {
              pluginRelativePath: 'icons/asam.png',
              title: 'ASAM',
              summary: 'The ASAM pirate skull and crossbones icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'asam.png',
              sizePixels: { width: 60, height: 60 },
              sizeBytes: 1684,
              tags: [],
            },{
              pluginRelativePath: 'icons/modu.png',
              title: 'MODU',
              summary: 'The MODU drill rig icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'modu.png',
              sizePixels: { width: 60, height: 60 },
              sizeBytes: 1684,
              tags: [],
            }
          ]
        }
      }
    }
  }
}

export = hooks