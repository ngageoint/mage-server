import plugin from './index'
import { MsiServiceType } from './nga-msi'
import { FeedsPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'
import { IconPluginHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.icons'

describe('msi mage plugin hooks', function() {

  let hooks: FeedsPluginHooks & IconPluginHooks

  beforeEach(async () => {
    hooks = await plugin.init()
  })

  describe('feeds hook', function() {

    it('provides the service type', async function() {

      const serviceTypes = await hooks.feeds.loadServiceTypes()

      expect(serviceTypes).toHaveLength(1)
      expect(serviceTypes[0]).toBeInstanceOf(MsiServiceType)
    })
  })

  describe('icons hook', function() {

    it('provides the bundled msi icons', async function() {

      const icons = await hooks.icons.loadPluginStaticIcons()

      expect(icons).toHaveLength(4)
      expect(icons[0]).toMatchObject({
        pluginRelativePath: 'icons/modu_feed_icon.png'
      })
      expect(icons[1]).toMatchObject({
        pluginRelativePath: 'icons/modu_map_icon.png'
      })
      expect(icons[2]).toMatchObject({
        pluginRelativePath: 'icons/port_feed_icon.png'
      })
      expect(icons[3]).toMatchObject({
        pluginRelativePath: 'icons/port_map_icon.png'
      })
    })
  })
})