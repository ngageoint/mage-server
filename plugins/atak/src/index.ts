
import { FeedServiceType } from "@ngageoint/mage.service/lib/entities/feeds/entities.feeds"
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'
import * as ATAK from './atak'
import { AxiosAtakTransport } from './transport.axios'
import { InitPluginHook } from '@ngageoint/mage.service/lib/plugins.api'

const transport = new AxiosAtakTransport()

const hooks: InitPluginHook = {
  async init(): Promise<FeedsPluginHooks> {
    return {
      feeds: {
        async loadServiceTypes(): Promise<FeedServiceType[]> {
          return [
            new ATAK.AtakServiceType(transport)
          ]
        }
      }
    }
  }
}

export = hooks
