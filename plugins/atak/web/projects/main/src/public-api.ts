/*
 * Public API Surface of atak-web
 */
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { AtakModule } from './lib/atak.module'
import { AtakPushStatusComponent } from './lib/atak-push-status/atak-push-status.component'

export * from './lib/atak.module'
export * from './lib/atak-push-status/atak-push-status.component'
export * from './lib/atak-push-status.service'

export const MAGE_WEB_HOOKS: PluginHooks = {
  module: AtakModule,
  adminTab: {
    title: 'TAK',
    tabContentComponent: AtakPushStatusComponent
  }
}
