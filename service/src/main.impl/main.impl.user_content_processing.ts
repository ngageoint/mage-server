import path from 'path'
import util from 'util'
import { AttachmentHook, runPipeline, ScannableContent } from '../plugins.api/plugins.api.attachments'
import * as UserModel from '../models/user'
import { stagedContentPath, finalizeContent, deletePendingContent } from '../api/user_content_store'
import environment from '../environment/env'

export type PendingUserContentReference = { userId: string, field: 'avatar' | 'icon' }

const patchContent = util.promisify(UserModel.patchContent)

export type UserContentProcessingConfig = {
  intervalSeconds: number
  batchSize: number
  retryLimit: number
}

export const defaultUserContentProcessingConfig: UserContentProcessingConfig = {
  intervalSeconds: 15,
  batchSize: 20,
  retryLimit: 3
}

/**
 * Runs the registered attachment-processing hooks against one pending
 * avatar/icon upload, then applies whatever patch the outcome calls for.
 * Never throws - any unexpected error is logged and the content is left
 * as-is to be retried on the next cycle.
 */
async function processPendingUserContent(
  reference: PendingUserContentReference,
  attachmentHooks: AttachmentHook[],
  retryLimit: number,
  console: Console
): Promise<void> {
  const { userId, field } = reference
  try {
    const content = await UserModel.getContentById(userId, field)
    if (!content || !content.stagedContentId) {
      console.warn(`user ${userId} field ${field} not found or has no staged content`)
      return
    }
    const stagedContentId = content.stagedContentId
    const stagedPath = stagedContentPath(stagedContentId)
    const scannable: ScannableContent = {}
    const outcome = await runPipeline(attachmentHooks, scannable, stagedPath)

    if (outcome.outcome === 'pass') {
      const relativePath = path.join(userId, field + path.extname(stagedContentId))
      const finalAbsolutePath = path.join(environment.userBaseDirectory, relativePath)
      await finalizeContent(stagedContentId, finalAbsolutePath)
      await patchContent(userId, field, { relativePath, processingStatus: 'success', stagedContentId: undefined })
      return
    }
    if (outcome.outcome === 'reject') {
      await deletePendingContent(stagedContentId)
      await patchContent(userId, field, {
        processingStatus: 'rejected',
        processingMessage: outcome.reason,
        processingHook: outcome.hookName,
        stagedContentId: undefined
      })
      return
    }
    // outcome.outcome === 'error'
    const retryCount = (content.processingRetryCount || 0) + 1
    if (retryCount < retryLimit) {
      await patchContent(userId, field, {
        processingStatus: 'pending',
        processingMessage: outcome.error.message,
        processingHook: outcome.hookName,
        processingRetryCount: retryCount
      })
      return
    }
    await deletePendingContent(stagedContentId)
    await patchContent(userId, field, {
      processingStatus: 'error',
      processingMessage: outcome.error.message,
      processingHook: outcome.hookName,
      processingRetryCount: retryCount,
      stagedContentId: undefined
    })
  }
  catch (err) {
    console.error(`unexpected error processing pending ${field} for user ${userId}`, err)
  }
}

export type UserContentProcessingJob = {
  stop: () => void
}

/**
 * Starts the core-owned background job that finds avatar/icon uploads
 * staged by user_content_store and runs them through whatever attachment-
 * processing hooks plugins have registered. Modeled on
 * startAttachmentProcessing, but polling models/user.js's own
 * findPendingContent/patchContent directly rather than through a
 * repository abstraction, since there is no per-event sharding to account
 * for on the user collection.
 */
export function startUserContentProcessing(
  attachmentHooks: AttachmentHook[],
  console: Console,
  config: Partial<UserContentProcessingConfig> = {}
): UserContentProcessingJob {
  const resolvedConfig: UserContentProcessingConfig = { ...defaultUserContentProcessingConfig, ...config }
  let stopped = false

  async function processNextBatch(): Promise<void> {
    if (stopped) {
      return
    }
    try {
      const references: PendingUserContentReference[] = await UserModel.findPendingContent(resolvedConfig.batchSize)
      for (const reference of references) {
        if (stopped) {
          break
        }
        await processPendingUserContent(reference, attachmentHooks, resolvedConfig.retryLimit, console)
      }
    }
    catch (err) {
      console.error('error processing pending user content', err)
    }
    if (!stopped) {
      setTimeout(() => { processNextBatch() }, resolvedConfig.intervalSeconds * 1000)
    }
  }

  processNextBatch()

  return {
    stop: () => {
      stopped = true
    }
  }
}
