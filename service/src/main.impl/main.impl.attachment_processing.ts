import { AttachmentHook, runPipeline } from '../plugins.api/plugins.api.attachments'
import { AttachmentPatchAttrs, AttachmentStore, AttachmentStoreError, ObservationRepositoryForEvent, StagedAttachmentContentRef, AttachmentProcessingStatus } from '../entities/observations/entities.observations'
import { findPendingAttachments, PendingAttachmentReference } from '../adapters/observations/adapters.observations.db.mongoose'

export type AttachmentProcessingConfig = {
  intervalSeconds: number
  batchSize: number
  retryLimit: number
}

export const defaultAttachmentProcessingConfig: AttachmentProcessingConfig = {
  intervalSeconds: 15,
  batchSize: 20,
  retryLimit: 3
}

/**
 * Runs the registered attachment-processing hooks against one pending
 * attachment, then applies whatever patch the outcome calls for. Never
 * throws - any unexpected error is logged and the attachment is left as-is
 * to be retried on the next cycle.
 */
async function processPendingAttachment(
  reference: PendingAttachmentReference,
  obsRepoForEvent: ObservationRepositoryForEvent,
  attachmentStore: AttachmentStore,
  attachmentHooks: AttachmentHook[],
  retryLimit: number,
  console: Console
): Promise<void> {
  try {
    const obsRepo = await obsRepoForEvent(reference.eventId)
    const observation = await obsRepo.findById(reference.observationId)
    if (!observation) {
      console.warn(`observation ${reference.observationId} not found while processing pending attachment ${reference.attachmentId}`)
      return
    }
    const attachment = observation.attachmentFor(reference.attachmentId)
    if (!attachment || !attachment.stagedContentId) {
      console.warn(`attachment ${reference.attachmentId} not found or has no staged content on observation ${reference.observationId}`)
      return
    }
    const stagedContentId = attachment.stagedContentId
    const stagedPath = await attachmentStore.stagedContentPath(stagedContentId)
    if (stagedPath instanceof AttachmentStoreError) {
      console.error(`error resolving staged content path for attachment ${attachment.id}`, stagedPath)
      return
    }
    const outcome = await runPipeline(attachmentHooks, attachment, stagedPath)
    if (outcome.outcome === 'pass') {
      const finalized = await attachmentStore.saveContent(new StagedAttachmentContentRef(stagedContentId), attachment.id, observation)
      if (finalized instanceof AttachmentStoreError) {
        console.error(`error finalizing clean attachment ${attachment.id}`, finalized)
        return
      }
      const patch: AttachmentPatchAttrs = { ...(finalized || {}), processingStatus: AttachmentProcessingStatus.Success, stagedContentId: undefined }
      await obsRepo.patchAttachment(observation, attachment.id, patch)
      return
    }
    if (outcome.outcome === 'reject') {
      await attachmentStore.deleteStagedContent(stagedContentId)
      await obsRepo.patchAttachment(observation, attachment.id, {
        processingStatus: AttachmentProcessingStatus.Rejected,
        processingMessage: outcome.reason,
        processingHook: outcome.hookName,
        stagedContentId: undefined
      })
      return
    }
    // outcome.outcome === 'error'
    const retryCount = (attachment.processingRetryCount || 0) + 1
    if (retryCount < retryLimit) {
      await obsRepo.patchAttachment(observation, attachment.id, {
        processingStatus: AttachmentProcessingStatus.Pending,
        processingMessage: outcome.error.message,
        processingHook: outcome.hookName,
        processingRetryCount: retryCount
      })
      return
    }
    await attachmentStore.deleteStagedContent(stagedContentId)
    await obsRepo.patchAttachment(observation, attachment.id, {
      processingStatus: AttachmentProcessingStatus.Error,
      processingMessage: outcome.error.message,
      processingHook: outcome.hookName,
      processingRetryCount: retryCount,
      stagedContentId: undefined
    })
  }
  catch (err) {
    console.error(`unexpected error processing pending attachment ${reference.attachmentId} on observation ${reference.observationId}`, err)
  }
}

export type AttachmentProcessingJob = {
  stop: () => void
}

/**
 * Starts the core-owned background job that finds attachments staged by
 * storeAttachmentContent and runs them through whatever attachment-
 * processing hooks plugins have registered. Modeled on the image plugin's
 * self-rescheduling setTimeout shape, but core-owned rather than plugin-
 * owned, since it must run hooks contributed by any enabled plugin.
 */
export function startAttachmentProcessing(
  obsRepoForEvent: ObservationRepositoryForEvent,
  attachmentStore: AttachmentStore,
  attachmentHooks: AttachmentHook[],
  console: Console,
  config: Partial<AttachmentProcessingConfig> = {}
): AttachmentProcessingJob {
  const resolvedConfig: AttachmentProcessingConfig = { ...defaultAttachmentProcessingConfig, ...config }
  let stopped = false

  async function processNextBatch(): Promise<void> {
    if (stopped) {
      return
    }
    try {
      const references = await findPendingAttachments(resolvedConfig.batchSize)
      for (const reference of references) {
        if (stopped) {
          break
        }
        await processPendingAttachment(reference, obsRepoForEvent, attachmentStore, attachmentHooks, resolvedConfig.retryLimit, console)
      }
    }
    catch (err) {
      console.error('error processing pending attachments', err)
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
