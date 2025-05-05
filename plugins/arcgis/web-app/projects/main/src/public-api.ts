/*
 * Public API Surface of mage-arc-web
 */
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { MageArcModule } from './lib/mage-arc.module'
import { ArcAdminComponent } from './lib/arc-admin/arc-admin.component'

export * from './lib/arc-admin/arc-admin.component'
export * from './lib/mage-arc.module'
export * from './lib/arc-layer/arc-layer.component'
export * from './lib/arc-event/arc-event.component'

export const MAGE_WEB_HOOKS: PluginHooks = {
  module: MageArcModule,
  adminTab: {
    title: 'ArcGIS',
    tabContentComponent: ArcAdminComponent
  }
}
