import plugin from './index'
import { TakGovServiceType, TakOpenServiceType } from './atak'
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'

describe('atak mage plugin hooks', function() {

  let hooks: FeedsPluginHooks

  beforeEach(async () => {
    hooks = await plugin.init()
  })

  describe('feeds hook', function() {

    it('provides both the Gov TAK and OpenTAK service types', async function() {

      const serviceTypes = await hooks.feeds.loadServiceTypes()

      expect(serviceTypes).toHaveLength(2)
      expect(serviceTypes[0]).toBeInstanceOf(TakGovServiceType)
      expect(serviceTypes[1]).toBeInstanceOf(TakOpenServiceType)
    })
  })
})
