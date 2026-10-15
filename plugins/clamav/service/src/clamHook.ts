import fs from 'fs'
import { scan } from './scan'
import { AttachmentHook } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.attachments'

// ClamAV hook start
export const clamavHook: AttachmentHook = async function clamavHook(attachment, stagedFilePath) {
    const host = process.env.MAGE_CLAMAV_HOST
    const port = process.env.MAGE_CLAMAV_PORT ? Number(process.env.MAGE_CLAMAV_PORT) : undefined

    // Outcome from stream
    const outcome = await scan(fs.createReadStream(stagedFilePath), { host, port })

    // Message return for a rejected statement
    if (outcome.outcome === 'reject' ) {
        return { outcome: 'reject', reason: `This attachment (${attachment.name}) was flagged as potentially malicious and could not be uploaded - (${outcome.reason})` }
    }

    // Message return for errors (not including malicious attachments)
    if (outcome.outcome === 'error') {
        return { outcome: 'error', error: new Error(`Virus scan could not be completed - (${outcome.error.message})`, { cause: outcome.error }) }
    }

    return outcome
}