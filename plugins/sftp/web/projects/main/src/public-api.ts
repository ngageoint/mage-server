/*
 * Public API Surface of sftp-web
 */
import { PluginHooks } from '@ngageoint/mage.web-core-lib/plugin'
import { SFTPModule } from './lib/sftp.module'
import { SftpAdminComponent } from './lib/sftp-admin/sftp-admin.component'
import { ConfigurationComponent } from './lib/configuration/configuration.component'

export * from './lib/sftp.module'
export * from './lib/configuration/configuration.component'
export * from './lib/sftp-admin/sftp-admin.component'
export * from './lib/observation-status/observation-status.component'
export * from './lib/observation-status/observation-status.service'

export const MAGE_WEB_HOOKS: PluginHooks = {
  module: SFTPModule,
  adminTab: {
    title: 'SFTP',
    tabContentComponent: ConfigurationComponent
  }
}
