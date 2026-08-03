import { InitPluginHook } from '@ngageoint/mage.service/lib/plugins.api'
import { clamavHook } from './clamHook'

const clamavPluginHooks: InitPluginHook = {
    init: async () => {
        return { attachmentHooks: [clamavHook] }
    }
}

// One object for export
export = clamavPluginHooks