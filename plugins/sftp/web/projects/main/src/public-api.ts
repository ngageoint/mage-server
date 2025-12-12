/*
 * Public API Surface of sftp-web
 */
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { SFTPModule } from './lib/sftp.module'
import { ConfigurationComponent } from './lib/configuration/configuration.component'

export * from './lib/sftp.module'
export * from './lib/configuration/configuration.component'

export const MAGE_WEB_HOOKS: PluginHooks = {
  module: SFTPModule,
  adminTab: {
    title: 'SFTP',
    icon: {
      path: 'assets/drive_file_move_black_24dp.svg'
    },
    tabContentComponent: ConfigurationComponent
  }
}
