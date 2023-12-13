import { MageEventAttrs, MageEventId, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { Attachment, AttachmentId, AttachmentStore, Observation, ObservationId, ObservationRepositoryForEvent, AttachmentPatchAttrs, Thumbnail, EventScopedObservationRepository, AttachmentStoreError, putAttachmentThumbnailForMinDimension, StagedAttachmentContent, patchAttachment } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import path from 'path'

export interface ImagePluginConfig {
  /**
   * When true, the plugin will process images.  When false, the plugin will
   * idly contemplate its existence.
   */
  enabled: boolean
  /**
   * Query the database for new image attachments to process at the given
   * repeating time interval in seconds.
   */
  intervalSeconds: number
  /**
   * Limit processing to the given number of image attachments during one
   * interval.  This may be necessary to avoid using too much CPU time just for
   * image processing, potentially affecting server performance.  If the value
   * is `null` or less-than-or-equal-to 0, the plugin will process as many
   * image attachments as the database query yields.
   */
  intervalBatchSize: number
  /**
   * Generate thumbnails by scaling images to the given list of pixel sizes.
   * The plugin scales the lesser of the image's width or height to the target
   * thumbnail size, and scales the greater dimension to the same ratio as the
   * lesser dimension.  The plugin will not scale images when the original
   * image is smaller than the thumbnail size.  An empty array disables
   * thumbnails.
   */
  thumbnailSizes: number[]
}

export const defaultImagePluginConfig = Object.freeze<Required<ImagePluginConfig>>({
  enabled: true,
  intervalSeconds: 60,
  intervalBatchSize: 10,
  thumbnailSizes: [ 150, 320, 800, 1024, 2048 ],
})

/**
 * Create the image plugin app controller.
 *
 * {@link defaultImagePluginConfig | default configuration}.
 * @param stateRepo
 * @param eventRepo
 * @param obsRepoForEvent
 * @param attachmentStore
 * @param attachmentQuery
 * @param imageService
 * @param console
 * @returns
 */
export const createImagePluginControl = async (
  stateRepo: PluginStateRepository<ImagePluginConfig>,
  eventRepo: MageEventRepository,
  obsRepoForEvent: ObservationRepositoryForEvent,
  attachmentStore: AttachmentStore,
  attachmentQuery: FindUnprocessedImageAttachments,
  imageService: ImageService,
  console: Console,
): Promise<ImagePluginControl> => {
  const processing = {
    nextStates: new Map<MageEventId, EventProcessingState>(),
    nextTimeout: undefined as NodeJS.Timeout | undefined,
    runningInterval: Promise.resolve(),
    stopped: true
  }
  async function safeGetConfig(): Promise<ImagePluginConfig> {
    return await stateRepo.get().then(x => !!x ? x : stateRepo.put(defaultImagePluginConfig))
  }
  async function processAndScheduleNext(): Promise<void> {
    if (processing.stopped) {
      return
    }
    const config = await safeGetConfig()
    if (!config.enabled) {
      return
    }
    return await processImageAttachments(config!, processing.nextStates || null, attachmentQuery, imageService, eventRepo, obsRepoForEvent, attachmentStore, console)
      .then(
        eventStates => {
          processing.nextStates = eventStates
          processing.nextTimeout = setTimeout(() => {
            processing.runningInterval = processAndScheduleNext()
          }, config.intervalSeconds * 1000)
        },
        err => {
          console.error('error during processing interval', err)
        }
      )
  }
  function start(): void {
    if (!processing.stopped) {
      return
    }
    processing.stopped = false
    processing.runningInterval = processAndScheduleNext()
  }
  async function stop(): Promise<void> {
    processing.stopped = true
    clearTimeout(processing.nextTimeout)
    await processing.runningInterval
  }
  const control: ImagePluginControl = {
    async getConfig(): Promise<ImagePluginConfig> {
      const config = await stateRepo.get()
      return config!
    },
    async applyConfig(configPatch: Partial<ImagePluginConfig>): Promise<ImagePluginConfig> {
      const current = await safeGetConfig()
      const next = Object.keys(defaultImagePluginConfig).reduce((config: Partial<ImagePluginConfig>, key: string) => {
        const configKey = key as keyof ImagePluginConfig
        const value = configPatch[configKey] === void(0) ? current[configKey] : configPatch[configKey]
        return { ...config, [configKey]: value }
      }, {} as Partial<ImagePluginConfig>) as ImagePluginConfig
      const saved = await stateRepo.put(next)
      stop().then(start)
      return saved
    },
    start,
    stop
  }
  return control
}

export interface ImagePluginControl {
  getConfig(): Promise<ImagePluginConfig>
  applyConfig(configPatch: Partial<ImagePluginConfig>): Promise<ImagePluginConfig>
  /**
   * Begin automatic attachment processing at the interval current configuration
   * {@link ImagePluginConfig.intervalSeconds | defines}.  If there is no saved
   * configuration, save the {@link defaultImagePluginConfig default}
   * configuration first.
   */
  start(): void
  /**
   * Cancel the recurring processing intervals and wait for the current
   * interval to finish.
   */
  stop(): Promise<void>
}

export type EventProcessingState = {
  event: MageEventAttrs,
  latestAttachmentProcessedTimestamp: number
}

/**
 TODO:
 reads zero-byte file (?) and fails - mark as processed

2023-09-27T09:31:50.738Z - [mage.image] error processing attachment {
eventId: 17,
observationId: '619ec65d7dc44d090239b266',
attachmentId: '619ec6677dc44d090239b268'
}
-- process result: [Error: pngload_buffer: libspng read error vips2png: unable to write to target target]

2023-09-27T20:26:57.400Z - [mage.image] error processing attachment {
  eventId: 17,
  observationId: '619fbe0b7dc44d090239b4d4',
  attachmentId: '619fbe107dc44d090239b4d6'
}
-- process result: [Error: Input buffer contains unsupported image format]
 */
export async function processImageAttachments(
  pluginState: ImagePluginConfig,
  eventProcessingStates: Map<MageEventId, EventProcessingState> | null,
  findUnprocessedAttachments: FindUnprocessedImageAttachments,
  imageService: ImageService,
  eventRepo: MageEventRepository,
  observationRepoForEvent: ObservationRepositoryForEvent,
  attachmentStore: AttachmentStore,
  console: Console
): Promise<Map<MageEventId, EventProcessingState>> {
  console.info('processing image attachments ...')
  const startTime = Date.now()
  const allEvents = await eventRepo.findActiveEvents()
  eventProcessingStates = syncProcessingStatesFromAllEvents(allEvents, eventProcessingStates)
  const eventLatestModifiedTimes = new Map<MageEventId, number>()
  const unprocessedAttachments = await findUnprocessedAttachments(Array.from(eventProcessingStates.values()), null, startTime, pluginState.intervalBatchSize)
  unprocessedAttachments[Symbol.asyncIterator]
  let processedCount = 0
  for await (const unprocessed of unprocessedAttachments) {
    // TODO: check results for errors
    console.info(`processing attachment`, unprocessed)
    const { observationId, attachmentId } = unprocessed
    const observationRepo = await observationRepoForEvent(unprocessed.eventId)
    const orient = async (observation: Observation): Promise<AttachmentProcessingResult> =>
      orientAttachmentImage(observation, attachmentId, imageService, attachmentStore, console)
    const thumbnail = async (observation: Observation): Promise<AttachmentProcessingResult> =>
      thumbnailAttachmentImage(observation, attachmentId, pluginState.thumbnailSizes, imageService, attachmentStore, console)
    const [ original, processed ] = await observationRepo.findById(observationId)
      .then(saveResultOf(orient, observationRepo))
      .then(saveResultOf(thumbnail, observationRepo))
    if (original instanceof Observation) {
      if (processed instanceof Observation) {
        const eventLatestModified = eventLatestModifiedTimes.get(unprocessed.eventId) || 0
        const attachment = original.attachmentFor(attachmentId)
        const attachmentLastModified = attachment?.lastModified?.getTime() || original.lastModified.getTime()
        if (attachmentLastModified > eventLatestModified) {
          eventLatestModifiedTimes.set(unprocessed.eventId, attachmentLastModified)
        }
        console.info(`processed attachment ${attachment?.name || '<unnamed>'}`, unprocessed)
      }
      else {
        console.error(`error processing attachment`, unprocessed, '\n-- process result:', processed)
        const attachment = original.attachmentFor(attachmentId)
        if (attachment && !attachment.oriented) {
          const oriented = await observationRepo.patchAttachment(original, attachmentId, { oriented: true })
          if (oriented instanceof Error) {
            console.error(`error marking attachment oriented after failed processing:`, unprocessed, oriented)
          }
        }
      }
      processedCount++
    }
  }
  console.info(`finished image attachment processing interval - ${processedCount} attachments`)
  return new Map<MageEventId, EventProcessingState>(Array.from(eventProcessingStates.entries(), ([ eventId, state ]) => {
    return [ eventId, { event: state.event, latestAttachmentProcessedTimestamp: eventLatestModifiedTimes.get(eventId) || 0 } ]
  }))
}

export class AttachmentProcessingResult {

  constructor(
    readonly observation: Observation,
    readonly attachmentId: AttachmentId,
    readonly patch?: AttachmentPatchAttrs,
    readonly error?: Error,
  ) {}

  get success(): boolean { return !this.error }
}

export async function orientAttachmentImage (
  observation: Observation,
  attachmentId: AttachmentId,
  imageService: ImageService,
  attachmentStore: AttachmentStore,
  console: Console
): Promise<AttachmentProcessingResult> {
  const attachment = observation.attachmentFor(attachmentId)
  if (!attachment) {
    return new AttachmentProcessingResult(observation, attachmentId, undefined, Error(`attachment ${attachmentId} does not exist on observation ${observation.id}`))
  }
  const content = await attachmentStore.readContent(attachmentId, observation)
  if (!content || content instanceof Error) {
    console.error(`error reading content of image attachment ${attachmentId} observation ${observation.id}:`, content || 'content not found')
    return new AttachmentProcessingResult(observation, attachmentId, undefined, content || new Error('content not found'))
  }
  const pending = await attachmentStore.stagePendingContent()
  const oriented = await imageService.autoOrient(imageContentForAttachment(attachment, content), pending.tempLocation)
  if (oriented instanceof Error) {
    console.error(`error orienting attachment ${attachmentId} on observation ${observation.id} at ${attachment.contentLocator}`, oriented)
    return new AttachmentProcessingResult(observation, attachmentId, undefined, oriented)
  }
  const storeResult = await attachmentStore.saveContent(pending, attachment.id, observation)
  if (storeResult instanceof AttachmentStoreError) {
    console.error(`error saving pending oriented content ${pending.id} for attachment ${attachmentId} on observation ${observation.id}:`, storeResult)
    return new AttachmentProcessingResult(observation, attachmentId, undefined, storeResult)
  }
  const patch: AttachmentPatchAttrs = {
    oriented: true,
    contentType: oriented.mediaType,
    size: oriented.sizeInBytes,
    ...oriented.dimensions,
    ...storeResult,
  }
  return new AttachmentProcessingResult(observation, attachmentId, patch)
}

export async function thumbnailAttachmentImage(
  observation: Observation, attachmentId: AttachmentId, thumbnailSizes: number[],
  imageService: ImageService, attachmentStore: AttachmentStore, console: Console): Promise<AttachmentProcessingResult> {
  if (thumbnailSizes.length === 0) {
    return new AttachmentProcessingResult(observation, attachmentId)
  }
  const attachment = observation.attachmentFor(attachmentId)
  if (!attachment) {
    const err = new Error(`attachment ${attachmentId} does not exist on observation ${observation.id}`)
    return new AttachmentProcessingResult(observation, attachmentId, undefined, err)
  }
  /*
  TODO: this thumbnail meta-data and content saving sequence is pretty awkward,
  having to add thumbnails to an observation to pass to the content store,
  which returns updates for the thumbnails that the client then must apply to
  the observation to patch the attachment in the database.  these APIs could
  use some modification to be more convenient and intuitive.
  */
  const thumbResults = (await Promise.all(thumbnailSizes.map(thumbnailSize => {
    return generateAndStageThumbnail(thumbnailSize, attachment, observation, imageService, attachmentStore, console)
  }))).filter(x => !(x instanceof Error)) as StagedThumbnail[]
  let obsWithThumbs = thumbResults.reduce((obsWithThumbs, thumbResult) => {
    if (thumbResult instanceof Error) {
      return obsWithThumbs
    }
    return putAttachmentThumbnailForMinDimension(obsWithThumbs, attachmentId, thumbResult.thumbnail) as Observation
  }, observation)
  const storedThumbs = await Promise.all(thumbResults.map(stagedThumb => {
    return attachmentStore.saveThumbnailContent(stagedThumb.pendingContent, stagedThumb.thumbnail.minDimension, attachmentId, obsWithThumbs)
  }))
  obsWithThumbs = storedThumbs.reduce((obsWithThumbs, storedThumb) => {
    if (storedThumb instanceof Error || !storedThumb) {
      return obsWithThumbs
    }
    return putAttachmentThumbnailForMinDimension(obsWithThumbs, attachmentId, storedThumb) as Observation
  }, obsWithThumbs)
  const storedThumbPatch: AttachmentPatchAttrs = { thumbnails: obsWithThumbs.attachmentFor(attachmentId)!.thumbnails }
  return new AttachmentProcessingResult(observation, attachmentId, storedThumbPatch)
}

function syncProcessingStatesFromAllEvents(allEvents: MageEventAttrs[], states: Map<MageEventId, EventProcessingState> | null | undefined): Map<MageEventId, EventProcessingState> {
  states = states || new Map()
  const newStates = new Map<MageEventId, EventProcessingState>()
  for (const event of allEvents) {
    const state = states.get(event.id) || { event, latestAttachmentProcessedTimestamp: 0 }
    newStates.set(event.id, state)
  }
  return newStates
}

type ObservationUpdateResult = [ Observation | Error | null, Observation | Error | null ]

/**
 * Perform the given attachment processing operation.  If the operation
 * produces an attachment patch, apply the patch and save the observation.
 */
function saveResultOf(processAttachment: (o: Observation) => Promise<AttachmentProcessingResult>, repo: EventScopedObservationRepository): (target: Observation | null | Error | ObservationUpdateResult) => Promise<ObservationUpdateResult> {
  return async (target): Promise<ObservationUpdateResult> => {
    const [ original, next ] = Array.isArray(target) ? target : [ target, target ]
    if (original instanceof Observation && next instanceof Observation) {
      const result = await processAttachment(next)
      if (result.patch) {
        const patched = await repo.patchAttachment(next, result.attachmentId, result.patch)
        return [ original, result.error || patched ]
      }
      return [ original, result.error || original ]
    }
    return [ original, next ]
  }
}

type StagedThumbnail = {
  thumbnail: Thumbnail,
  pendingContent: StagedAttachmentContent
}

async function generateAndStageThumbnail(thumbnailSize: number, attachment: Attachment, observation: Observation, imageService: ImageService, attachmentStore: AttachmentStore, console: Console): Promise<Error | StagedThumbnail> {
  const attachmentId = attachment.id
  const attachmentName = attachment.name || ''
  const attachmentExt = path.extname(attachmentName)
  const attachmentBareName = attachmentName.slice(0, attachmentName.length - attachmentExt.length) || attachmentId
  const content = await attachmentStore.readContent(attachmentId, observation)
  if (content instanceof Error) {
    const message = `error reading content for attachment ${attachmentId}, observation ${observation.id}: ${content}`
    console.error(message, content)
    return new Error(message)
  }
  if (content === null) {
    const message = `content not found for attachment ${attachmentId}, observation ${observation.id}`
    console.error(message)
    return new Error(message)
  }
  const source = imageContentForAttachment(attachment, content)
  const pendingContent = await attachmentStore.stagePendingContent()
  const thumbInfo = await imageService.scaleToDimension(thumbnailSize, source, pendingContent.tempLocation)
  if (thumbInfo instanceof Error) {
    const message = `error scaling image on attachment ${attachmentId}: ${thumbInfo}`
    console.error(message, thumbInfo)
    return new Error(message)
  }
  const thumbnail: Thumbnail = attachment.thumbnails.find(x => x.minDimension === thumbnailSize) || { minDimension: thumbnailSize }
  return {
    thumbnail: {
      ...thumbnail,
      name: `${attachmentBareName}-${thumbnailSize}${attachmentExt}`,
      contentType: thumbInfo.mediaType,
      width: thumbInfo.dimensions.width,
      height: thumbInfo.dimensions.height,
      size: thumbInfo.sizeInBytes
    },
    pendingContent
  }
}

function imageContentForAttachment(x: Attachment, bytes: NodeJS.ReadableStream): ImageContent {
  const dimensions = typeof x.width === 'number' && typeof x.height === 'number' ? {
    width: x.width,
    height: x.height
  } : undefined
  return {
    bytes,
    dimensions,
    mediaType: x.contentType,
    sizeInBytes: x.size
  }
}

/**
 * Scale the dimensions of the given attachment to the dimensions of a
 * thumbnail with the given minimum target dimension.  Return null if either of
 * the attachment's dimensions are not numeric.
 * @param attachment
 * @param minThumbDimension
 * @returns
 */
export const thumbnailDimensionsForAttachment = (attachment: Attachment, minThumbDimension: number): { width: number, height: number } | null => {
  if (!attachment.width || attachment.width <= 0 || !attachment.height || attachment.height <= 0) {
    return null
  }
  const [ width, height ] = attachment.width <= attachment.height ?
    [ minThumbDimension, Math.ceil((minThumbDimension / attachment.width) * attachment.height) ] :
    [ Math.ceil((minThumbDimension / attachment.height) * attachment.width), minThumbDimension ]
  return { width, height }
}

export interface UnprocessedAttachmentReference {
  attachmentId: AttachmentId
  observationId: ObservationId
  eventId: MageEventId
}

/**
 * This is an adapter interface that encapsulates querying for observations in
 * the given MAGE events that have unprocessed attachments, as well as the
 * prioritization strategy of the attachments through the order of the returned
 * iterable.
 */
export interface FindUnprocessedImageAttachments {
  (eventProcessingStates: EventProcessingState[], lastModifiedAfter: number | null, lastModifiedBefore: number | null, limit: number | null): Promise<AsyncIterable<UnprocessedAttachmentReference>>
}

export interface ImageService {
  autoOrient(source: ImageContent, dest: NodeJS.WritableStream): Promise<Required<ImageDescriptor> | Error>
  scaleToDimension(minDimension: number, source: ImageContent, dest: NodeJS.WritableStream): Promise<Required<ImageDescriptor> | Error>
}

export interface ImageDescriptor {
  sizeInBytes?: number
  /**
   * IANA standard media type of the image content
   */
  mediaType?: string
  /**
   * The height and width of the image, if known
   */
  dimensions?: { width: number, height: number }
}

export interface ImageContent extends ImageDescriptor {
  bytes: NodeJS.ReadableStream
}

