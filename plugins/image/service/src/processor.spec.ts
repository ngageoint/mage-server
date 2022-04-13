import { EventProcessingState, FindUnprocessedImageAttachments, ImageContent, ImageDescriptor, ImagePluginState, ImageService, processImageAttachments, UnprocessedAttachmentReference } from './processor'
import { MageEventRepository, MageEventAttrs, MageEventId, MageEvent, copyMageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { addAttachment, Attachment, AttachmentId, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, ObservationId, PendingAttachmentContent, PendingAttachmentContentId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import stream from 'stream'
import { BufferWriteable } from './util.spec'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'

function minutes(x: number): number {
  return 1000 * 60 * x
}

function minutesAgo(x: number): number {
  return Date.now() - minutes(x)
}

function makeEvent(id: MageEventId): MageEventAttrs {
  return {
    id,
    acl: {},
    feedIds: [],
    forms: [
      {
        id: 1,
        archived: false,
        color: 'lavender',
        fields: [
          {
            id: 1,
            name: 'field1',
            required: false,
            title: 'Attachments',
            type: FormFieldType.Attachment,
          }
        ],
        name: 'Image Plugin Test',
        userFields: []
      }
    ],
    layerIds: [],
    name: `Event ${id}`,
    style: {},
  }
}

function makeObservation(id: ObservationId, eventId: MageEventId, ageInMinutes?: number): ObservationAttrs {
  const createdAt = typeof ageInMinutes === 'number' ? new Date(Date.now() - ageInMinutes * 60 * 1000) : new Date()
  return {
    id,
    eventId,
    createdAt,
    lastModified: createdAt,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ 100, 40 ] },
    properties: {
      timestamp: new Date(),
      forms: []
    },
    attachments: [],
    states: [],
  }
}

/**
 * Return `ObservationAttrs` with the given attachments array, and populated
 * with the form entries that the attachments reference.  The `lastModified`
 * timestamp on the observation will be the latest of the given attachments.
 * @param id
 * @param eventId
 * @param attachments
 * @returns
 */
function observationWithAttachments(id: ObservationId, event: MageEvent, attachments: Attachment[]): Observation {
  return Observation.evaluate({
    ...makeObservation(id, event.id),
    lastModified: attachments.reduce((latestTimestamp, attachment) => {
      return (attachment.lastModified?.getTime() || 0) > latestTimestamp.getTime() ? new Date(attachment.lastModified as Date) : latestTimestamp
    }, new Date(0)),
    properties: {
      timestamp: new Date(),
      forms: attachments.reduce((formEntries, attachment) => {
        const attachmentFormEntry = formEntries.find(x => x.id === attachment.observationFormId)
        if (!attachmentFormEntry) {
          return [
            ...formEntries,
            {
              id: attachment.observationFormId,
              formId: 1
            }
          ]
        }
        return formEntries
      }, [] as FormEntry[])
    },
    attachments
  }, event)
}

type AttachmentReadStream = jasmine.SpyObj<NodeJS.ReadableStream & { attachmentId: AttachmentId }>
function makeAttachmentReadStream(attachmentId: AttachmentId): AttachmentReadStream {
  return jasmine.createSpyObj<AttachmentReadStream>(`read-${attachmentId}`, [ 'read' ], { attachmentId })
}

type AttachmentWriteStream = jasmine.SpyObj<NodeJS.WritableStream & { attachmentId: AttachmentId }>
function makeAttachmentWriteStream(attachmentId: AttachmentId): AttachmentWriteStream {
  return jasmine.createSpyObj<AttachmentWriteStream>(`write-${attachmentId}`, [ 'write' ], { attachmentId })
}

const asyncIterableOf = <T>(items: T[]): AsyncIterable<T> => {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield Promise.resolve(item)
      }
    }
  }
}

function closeTo(target: number, delta: number): jasmine.AsymmetricMatcher<number> {
  return {
    asymmetricMatch(other) {
      return Math.abs(target - other) <= delta
    },
    jasmineToString(prettyPrint) {
      return `a number within ${delta} of ${target}`
    }
  }
}

/**
 * Within 100 milliseconds of `Date.now()`
 */
const closeToNow = () => closeTo(Date.now(), 100)

describe('processing interval', () => {

  let event1: MageEvent
  let event2: MageEvent
  let allEvents: Map<MageEventId, MageEvent>
  let eventRepo: jasmine.SpyObj<MageEventRepository>
  let observationRepos: Map<MageEventId, jasmine.SpyObj<EventScopedObservationRepository>>
  let attachmentStore: jasmine.SpyObj<AttachmentStore>
  let imageService: jasmine.SpyObj<ImageService>
  const observationRepoForEvent: (event: MageEventId) => Promise<jasmine.SpyObj<EventScopedObservationRepository>> = async event => {
    const repo = observationRepos.get(event)
    if (repo) {
      return repo
    }
    throw new Error(`no observation repository for event ${event}`)
  }

  beforeEach(() => {
    event1 = new MageEvent(makeEvent(1))
    event2 = new MageEvent(makeEvent(2))
    allEvents = new Map()
      .set(event1.id, event1)
      .set(event2.id, event2)
    eventRepo = jasmine.createSpyObj<MageEventRepository>('eventRepo', [ 'findActiveEvents' ])
    eventRepo.findActiveEvents.and.resolveTo(Array.from(allEvents.values()).map(copyMageEventAttrs))
    observationRepos = Array.from(allEvents.values()).reduce((repos, event) => {
      return repos.set(event.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepo-${event.id}`, [ 'findById', 'save' ]))
    }, new Map())
    attachmentStore = jasmine.createSpyObj<AttachmentStore>('attachmentStore',
      [ 'readContent', 'saveContent', 'readThumbnailContent', 'saveThumbnailContent', 'stagePendingContent' ])
    imageService = jasmine.createSpyObj<ImageService>('imageService', [ 'autoOrient', 'scaleToDimension' ])
  })

  it('queries for attachments based on last latest process time of each event and start time of interval', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: allEvents.get(1)!, latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 5 },
      { event: allEvents.get(2)!, latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 2 }
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginState = {
      enabled: true,
      intervalBatchSize: 1000,
      intervalSeconds: 60,
      thumbnailSizes: []
    }
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findAttachments').and.resolveTo(asyncIterableOf([]))
    await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore)

    expect(findUnprocessedAttachments).toHaveBeenCalledOnceWith(
      Array.from(eventProcessingStates.values()), null, closeToNow(), pluginState.intervalBatchSize)
  })

  it('returns the timestamps of the latest attachments processed for each event', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: copyMageEventAttrs(event1), latestAttachmentProcessedTimestamp: minutesAgo(5) },
      { event: copyMageEventAttrs(event2), latestAttachmentProcessedTimestamp: minutesAgo(4) },
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginState = {
      enabled: true,
      intervalBatchSize: 1000,
      intervalSeconds: 60,
      thumbnailSizes: []
    }
    const event1LatestAttachmentTime = minutesAgo(1)
    const event2LatestAttachmentTime = minutesAgo(3)
    const eventObservations = new Map<MageEventId, Observation[]>()
      .set(1, [
        observationWithAttachments('1.100', event1, [
          {
            id: '1.100.1',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(6)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          },
          {
            id: '1.100.2',
            fieldName: 'field1',
            lastModified: new Date(event1LatestAttachmentTime),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          },
        ]),
        observationWithAttachments('1.200', event1, [
          {
            id: '1.200.1',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(10)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          }
        ])
      ])
      .set(2, [
        observationWithAttachments('2.200', event2, [
          {
            id: '2.200.1',
            fieldName: 'field1',
            lastModified: new Date(),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: []
          }
        ]),
        observationWithAttachments('2.100', event2, [
          {
            id: '2.100.1',
            fieldName: 'field1',
            lastModified: new Date(event2LatestAttachmentTime),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          }
        ])
      ])
    const unprocessedAttachments: UnprocessedAttachmentReference[] = [
      {
        eventId: 1,
        observationId: '1.100',
        attachmentId: '1.100.1'
      },
      {
        eventId: 1,
        observationId: '1.100',
        attachmentId: '1.100.2'
      },
      {
        eventId: 2,
        observationId: '2.100',
        attachmentId: '2.100.1'
      },
      {
        eventId: 1,
        observationId: '1.200',
        attachmentId: '1.200.1'
      },
    ]
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findAttachments').and.resolveTo(asyncIterableOf(unprocessedAttachments))
    observationRepos.forEach((repo, eventId) => {
      repo.findById.and.callFake(id => {
        const observations = eventObservations.get(eventId)
        return Promise.resolve(observations?.find(x => x.id === id) || null)
      })
      repo.save.and.callFake(o => Promise.resolve(o))
    })
    imageService.autoOrient.and.resolveTo({
      mediaType: 'image/png',
      sizeInBytes: 30000,
      dimensions: { width: 1000, height: 1000 },
    })
    imageService.scaleToDimension.and.callFake((minDimension, source, dest) => Promise.resolve({
      mediaType: 'image/png',
      sizeInBytes: 30000,
      dimensions: { width: minDimension, height: Math.round(minDimension * 1.3) },
    }))
    attachmentStore.stagePendingContent.and.resolveTo({ tempLocation: makeAttachmentWriteStream('temp'), id: 'staged attachment' })
    attachmentStore.saveContent.and.resolveTo(null)
    attachmentStore.saveThumbnailContent.and.resolveTo(null)
    const processedEventStates = await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore)

    expect(processedEventStates.size).toEqual(2)
    expect(processedEventStates.get(1)?.event).toEqual(copyMageEventAttrs(event1))
    expect(processedEventStates.get(1)?.latestAttachmentProcessedTimestamp).toEqual(event1LatestAttachmentTime)
    expect(processedEventStates.get(2)?.event).toEqual(copyMageEventAttrs(event2))
    expect(processedEventStates.get(2)?.latestAttachmentProcessedTimestamp).toEqual(event2LatestAttachmentTime)
  })

  it('processes the attachments serially in the order the query returns', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: copyMageEventAttrs(event1), latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 5 },
      { event: copyMageEventAttrs(event2), latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 2 },
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginState = {
      enabled: true,
      intervalBatchSize: 1000,
      intervalSeconds: 60,
      thumbnailSizes: []
    }
    const eventObservations = new Map<MageEventId, Observation[]>()
      .set(1, [
        observationWithAttachments('1.100', event1, [
          {
            id: '1.100.1',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(6)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          },
          {
            id: '1.100.2',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(2)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          },
        ]),
        observationWithAttachments('1.200', event1, [
          {
            id: '1.200.1',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(10)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          }
        ])
      ])
      .set(2, [
        observationWithAttachments('2.200', event2, [
          {
            id: '2.200.1',
            fieldName: 'field1',
            lastModified: new Date(),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: []
          }
        ]),
        observationWithAttachments('2.100', event2, [
          {
            id: '2.100.1',
            fieldName: 'field1',
            lastModified: new Date(minutesAgo(3)),
            observationFormId: 'form1',
            oriented: false,
            thumbnails: [],
          }
        ])
      ])
    type TestUnprocessed = UnprocessedAttachmentReference & { processed?: true }
    const unprocessedAttachments: TestUnprocessed[] = [
      {
        eventId: 1,
        observationId: '1.100',
        attachmentId: '1.100.1'
      },
      {
        eventId: 1,
        observationId: '1.100',
        attachmentId: '1.100.2'
      },
      {
        eventId: 2,
        observationId: '2.100',
        attachmentId: '2.100.1'
      },
      {
        eventId: 1,
        observationId: '1.200',
        attachmentId: '1.200.1'
      },
    ]
    const failNextIfCurrentNotProcessed = {
      cursor: -1,
      get current(): (UnprocessedAttachmentReference & { processed?: true }) | null {
        return unprocessedAttachments[this.cursor] || null
      },
      processCurrent(): TestUnprocessed {
        const processed = this.current!
        processed.processed = true
        return processed
      },
      async *[Symbol.asyncIterator]() {
        while (this.cursor < unprocessedAttachments.length - 1) {
          if (this.cursor < 0 || this.current?.processed === true) {
            this.cursor += 1
            yield Promise.resolve(unprocessedAttachments[this.cursor])
          }
          else {
            throw new Error(`attempted to get next attachment before processing current attachment ${this.cursor}`)
          }
        }
      }
    }
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findAttachments').and.resolveTo(failNextIfCurrentNotProcessed)
    attachmentStore.stagePendingContent.and.callFake(async () => ({
      tempLocation: {} as any,
      id: failNextIfCurrentNotProcessed.current!.attachmentId
    }))
    imageService.autoOrient.and.callFake((source: ImageContent, dest: AttachmentWriteStream) => {
      failNextIfCurrentNotProcessed.processCurrent()
      return Promise.resolve<Required<ImageDescriptor>>({
        mediaType: `image/png`,
        dimensions: { width: 120, height: 120 },
        sizeInBytes: 1000
      })
    })
    observationRepos.forEach((repo, eventId) => {
      repo.findById.and.callFake(id => {
        const observations = eventObservations.get(eventId)
        return Promise.resolve(observations?.find(x => x.id === id) || null)
      })
      repo.save.and.callFake(o => Promise.resolve(o))
    })
    attachmentStore.saveContent.and.resolveTo(null)
    attachmentStore.saveThumbnailContent.and.resolveTo(null)

    await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore)

    expect(imageService.autoOrient).toHaveBeenCalledTimes(unprocessedAttachments.length)
    for (const a of unprocessedAttachments) {
      expect(a.processed).toBe(true)
    }
  })

  it('generates the configured thumbnails of the oriented image', async () => {

    const pluginState: ImagePluginState = {
      enabled: true,
      intervalBatchSize: 1,
      intervalSeconds: 1000,
      thumbnailSizes: [ 50, 100 ]
    }
    const attachment: Required<Attachment> = {
      id: '1.1000.1',
      observationFormId: 'form1',
      fieldName: 'field1',
      lastModified: new Date(minutesAgo(5)),
      name: 'test.png',
      contentType: 'image/png',
      width: 1000,
      height: 500,
      size: 10000,
      oriented: false,
      thumbnails: []
    }
    const orientedDimensions = Object.freeze({ width: attachment.height!, height: attachment.width! })
    const thumbDimensions = {
      [50]: Object.freeze({ width: 50, height: 100 }),
      [100]: Object.freeze({ width: 100, height: 200 })
    }
    const observation = observationWithAttachments('1.1000', event1, [
      attachment,
      {
        id: '1.1000.2',
        observationFormId: 'form1',
        fieldName: 'field1',
        lastModified: new Date(),
        contentType: 'audio/mp4',
        oriented: false,
        thumbnails: []
      }
    ])
    const unprocessed: UnprocessedAttachmentReference = {
      attachmentId: attachment.id,
      observationId: observation.id,
      eventId: 1,
    }
    const unorientedBytes = Buffer.from('happy little tree')
    const orientedBytes = Buffer.from('HAPPY LITTLE TREE')
    const thumbBytes = {
      50: Buffer.from('thumb 50'),
      100: Buffer.from('thumb 100')
    }

    const observationRepo = observationRepos.get(unprocessed.eventId)!
    const observations = new Map<ObservationId, Observation>().set(observation.id, observation)
    observationRepo.findById.and.callFake(async id => observations.get(id) || null)
    observationRepo.save.and.callFake(x => {
      observations.set(x.id, x)
      return Promise.resolve(x)
    })
    const attachmentStore = new BufferAttachmentStore()
    attachmentStore.attachmentContent.set(AttachmentContentKey(attachment.id, observation.id), unorientedBytes)
    imageService.autoOrient.and.callFake((source, dest) => {
      return new Promise(resolve => {
        stream.Readable.from(orientedBytes).pipe(dest).on('finish', () => {
          resolve({
            mediaType: attachment.contentType!,
            dimensions: orientedDimensions,
            sizeInBytes: attachment.size!
          })
        })
      })
    })
    const thumbnailSources = new Map<number, Buffer>()
    imageService.scaleToDimension.and.callFake(async (minDimension, source, dest) => {
      let sourceBytes = Buffer.alloc(0)
      for await (const chunk of source.bytes) {
        sourceBytes = Buffer.concat([ sourceBytes, chunk as Buffer ])
      }
      thumbnailSources.set(minDimension, sourceBytes)
      return new Promise(resolve => {
        const thumbnailBytes = thumbBytes[minDimension as keyof typeof thumbBytes]
        stream.Readable.from(thumbnailBytes).pipe(dest).on('finish', () => {
          resolve({
            dimensions: thumbDimensions[minDimension as keyof typeof thumbDimensions],
            mediaType: attachment.contentType!,
            sizeInBytes: attachment.size! * (minDimension / orientedDimensions.width)!
          })
        })
      })
    })
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findUnprocessedAttachments')
      .and.resolveTo(asyncIterableOf([ unprocessed ]))

    await processImageAttachments(pluginState, new Map(), findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore)

    expect(imageService.autoOrient).toHaveBeenCalledTimes(1)
    expect(imageService.scaleToDimension).toHaveBeenCalledTimes(2)
    expect(imageService.scaleToDimension).toHaveBeenCalledWith(50, jasmine.anything(), jasmine.anything())
    expect(imageService.scaleToDimension).toHaveBeenCalledWith(100, jasmine.anything(), jasmine.anything())
    expect(Array.from(thumbnailSources.keys())).toEqual([ 50, 100 ])
    expect(thumbnailSources.get(50)).toEqual(orientedBytes)
    expect(thumbnailSources.get(100)).toEqual(orientedBytes)
    expect(attachmentStore.attachmentContent.get(AttachmentContentKey(unprocessed.attachmentId, observation.id))).toEqual(orientedBytes)
    expect(attachmentStore.thumbnailContent.get(ThumbnailContentKey(50, unprocessed.attachmentId, observation.id))).toEqual(thumbBytes[50])
    expect(attachmentStore.thumbnailContent.get(ThumbnailContentKey(100, unprocessed.attachmentId, observation.id))).toEqual(thumbBytes[100])
    expect(observationRepo.save).toHaveBeenCalledTimes(2)
  })

  it('does not generate thumbnails if orient fails')

  it('updates the attachment after orienting and creating thumbnails')

  it('skips processing events that do not exist')

  it('skips processing events that are complete')
})

type AttachmentContentKey = string
function AttachmentContentKey(attachmentId: AttachmentId, observationId: ObservationId): AttachmentContentKey {
  return `${observationId}::${attachmentId}`
}
type ThumbnailContentKey = string
function ThumbnailContentKey(minDimension: number, attachmentId: AttachmentId, observationId: ObservationId): ThumbnailContentKey {
  return `${observationId}::${attachmentId}@${minDimension}`
}

class BufferAttachmentStore implements AttachmentStore {

  readonly pendingContent = new Map<string, Buffer>()
  readonly attachmentContent = new Map<AttachmentContentKey, Buffer>()
  readonly thumbnailContent = new Map<ThumbnailContentKey, Buffer>()
  private nextPendingId = 1

  async stagePendingContent(): Promise<PendingAttachmentContent> {
    const id = `pending::${this.nextPendingId++}`
    const tempLocation = new BufferWriteable()
    const pending: PendingAttachmentContent = {
      id,
      tempLocation: tempLocation.on('finish', () => {
        this.pendingContent.set(id, tempLocation.content)
      })
    }
    this.pendingContent.set(id, Buffer.alloc(0))
    return pending
  }
  async saveContent(content: NodeJS.ReadableStream | PendingAttachmentContentId, attachmentId: string, observation: Observation): Promise<AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound> | null> {
    if (typeof content === 'string') {
      const pendingBytes = this.pendingContent.get(content)
      if (pendingBytes) {
        const key = AttachmentContentKey(attachmentId, observation.id)
        this.pendingContent.delete(content)
        this.attachmentContent.set(key, pendingBytes)
        return null
      }
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, 'this store supports saving only staged content')
  }
  async saveThumbnailContent(content: NodeJS.ReadableStream | PendingAttachmentContentId, minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound> | null> {
    if (typeof content === 'string') {
      const pendingBytes = this.pendingContent.get(content)
      if (pendingBytes) {
        const key = ThumbnailContentKey(minDimension, attachmentId, observation.id)
        this.pendingContent.delete(content)
        this.thumbnailContent.set(key, pendingBytes)
        return null
      }
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, 'this store supports saving only staged content')
  }
  async readContent(attachmentId: AttachmentId, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError<AttachmentStoreErrorCode>> {
    const key = AttachmentContentKey(attachmentId, observation.id)
    const bytes = this.attachmentContent.get(key)
    if (bytes) {
      return stream.Readable.from(bytes)
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound)
  }
  async readThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError<AttachmentStoreErrorCode>> {
    const key = ThumbnailContentKey(minDimension, attachmentId, observation.id)
    const bytes = this.thumbnailContent.get(key)
    if (bytes) {
      return stream.Readable.from(bytes)
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound)
  }
  deleteContent(attachmentId: string, observation: Observation): Promise<AttachmentStoreError<AttachmentStoreErrorCode> | null> {
    throw new Error('Method not implemented.')
  }
  deleteThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError<AttachmentStoreErrorCode> | null> {
    throw new Error('Method not implemented.')
  }
}