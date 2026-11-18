/*
 * Public API Surface of tak-web
 */
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { TakModule } from './lib/tak.module'
import { TakPushStatusComponent } from './lib/tak-push-status/tak-push-status.component'

export * from './lib/tak.module'
export * from './lib/tak-push-status/tak-push-status.component'
export * from './lib/tak-push-status.service'

export const MAGE_WEB_HOOKS: PluginHooks = {
  module: TakModule,
  adminTab: {
    title: 'TAK',
    tabContentComponent: TakPushStatusComponent
  }
}
