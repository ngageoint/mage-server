import plugin from './index'
import { AtakServiceType } from './atak'
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'

describe('atak mage plugin hooks', function() {

  let hooks: FeedsPluginHooks

  beforeEach(async () => {
    hooks = await plugin.init()
  })

  describe('feeds hook', function() {

    it('provides the service type', async function() {

      const serviceTypes = await hooks.feeds.loadServiceTypes()

      expect(serviceTypes).toHaveLength(1)
      expect(serviceTypes[0]).toBeInstanceOf(AtakServiceType)
    })
  })
})
