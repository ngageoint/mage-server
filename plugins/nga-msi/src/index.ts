
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
              pluginRelativePath: 'icons/modu_feed_icon.png',
              title: 'MODU Feed',
              summary: 'The MODU drill rig feed icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'modu_feed_icon.png',
              sizePixels: { width: 48, height: 48 },
              sizeBytes: 807,
              tags: [],
            },{
              pluginRelativePath: 'icons/modu_map_icon.png',
              title: 'MODU Map',
              summary: 'The MODU drill rig map icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'modu_map_icon.png',
              sizePixels: { width: 60, height: 60 },
              sizeBytes: 3588,
              tags: [],
            },{
              pluginRelativePath: 'icons/port_feed_icon.png',
              title: 'Ports Feed',
              summary: 'The world ports feed icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'port_feed_icon.png',
              sizePixels: { width: 48, height: 48 },
              sizeBytes: 698,
              tags: [],
            },{
              pluginRelativePath: 'icons/port_map_icon.png',
              title: 'Ports Map',
              summary: 'The world ports map icon',
              contentHash: '1',
              imageType: 'raster',
              mediaType: 'image/png',
              fileName: 'port_map_icon.png',
              sizePixels: { width: 60, height: 60 },
              sizeBytes: 3616,
              tags: [],
            }
          ]
        }
      }
    }
  }
}

export = hooks