import { EventProcessingState, FindUnprocessedImageAttachments, ImageContent, ImageDescriptor, ImagePluginConfig, ImageService, createImagePluginControl, orientAttachmentImage, processImageAttachments, thumbnailAttachmentImage, UnprocessedAttachmentReference, ImagePluginControl, defaultImagePluginConfig, AttachmentProcessingResult } from './processor'
import { MageEventRepository, MageEventAttrs, MageEventId, MageEvent, copyMageEventAttrs } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { Attachment, AttachmentContentPatchAttrs, AttachmentId, AttachmentPatchAttrs, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, copyObservationAttrs, copyThumbnailAttrs, EventScopedObservationRepository, FormEntry, Observation, ObservationAttrs, ObservationId, patchAttachment, StagedAttachmentContent, StagedAttachmentContentId, StagedAttachmentContentRef, Thumbnail, ThumbnailContentPatchAttrs } from '@ngageoint/mage.service/lib/entities/observations/entities.observations'
import stream from 'stream'
import util from 'util'
import { BufferWriteable } from './util.spec'
import { FormFieldType } from '@ngageoint/mage.service/lib/entities/events/entities.events.forms'
import _ from 'lodash'
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { FindUnprocessedAttachments } from './adapters.db.mongo'

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
    favoriteUserIds: [],
  }
}

function sameAsObservationWithoutDates(expected: Observation): jasmine.AsymmetricMatcher<Observation> {
  const { createdAt, lastModified, ...expectedAttrs } = copyObservationAttrs(expected)
  expectedAttrs.attachments.forEach(x => delete x.lastModified)
  return {
    asymmetricMatch(actual: any, matchersUtil: jasmine.MatchersUtil): boolean {
      const { createdAt, lastModified, ...actualAttrs } = copyObservationAttrs(actual)
      actualAttrs.attachments.forEach(x => delete x.lastModified)
      return actual instanceof Observation && matchersUtil.equals(expectedAttrs, actualAttrs)
    },
    jasmineToString(prettyPrint): string {
      return `<an Observation instance equivalent to ${prettyPrint(expectedAttrs)}>`
    }
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

const asyncIterableOf = <T>(items: T[]): AsyncIterable<T> => {
  return {
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
      for (const item of items) {
        yield Promise.resolve(item)
      }
    }
  }
}

function closeTo(target: number, delta: number): jasmine.AsymmetricMatcher<number> {
  return {
    asymmetricMatch(other): boolean {
      return Math.abs(target - other) <= delta
    },
    jasmineToString(prettyPrint): string {
      return `a number within ${delta} of ${target}`
    }
  }
}

/**
 * Within 100 milliseconds of `Date.now()`
 */
const closeToNow = (): jasmine.AsymmetricMatcher<number | Date> => closeTo(Date.now(), 100)

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
      return repos.set(event.id, jasmine.createSpyObj<EventScopedObservationRepository>(`observationRepo-${event.id}`, [ 'findById', 'patchAttachment', 'save' ]))
    }, new Map())
    attachmentStore = jasmine.createSpyObj<AttachmentStore>('attachmentStore',
      [ 'readContent', 'saveContent', 'readThumbnailContent', 'saveThumbnailContent', 'stagePendingContent' ])
    imageService = jasmine.createSpyObj<ImageService>('imageService', [ 'autoOrient', 'scaleToDimension' ])
  })

  describe('orient phase', () => {

    it('orients the attachment image and produces an attachment patch', async () => {

      const att: Attachment = Object.freeze({
        id: '1.123.1',
        observationFormId: 'form1',
        fieldName: 'field1',
        oriented: false,
        thumbnails: [],
        contentType: 'image/jpeg',
        name: 'test1.jpeg',
        size: 320000,
        contentLocator: String(Date.now())
      })
      const originalContent = Buffer.from('sniugnep fo otohp')
      const originalConstentStream = stream.Readable.from(originalContent)
      const stagedContent = new StagedAttachmentContent('stage1', new BufferWriteable())
      const obsBefore: Observation = observationWithAttachments('1.123', event1, [ att ])
      const obsRepo = observationRepos.get(event1.id)!
      attachmentStore.readContent.and.resolveTo(originalConstentStream)
      attachmentStore.stagePendingContent.and.resolveTo(stagedContent)
      attachmentStore.saveContent.and.resolveTo({ size: 321321, contentLocator: att.contentLocator! })
      imageService.autoOrient.and.callFake(async (source, dest) => {
        const oriented = new BufferWriteable()
        await util.promisify(stream.pipeline)(source.bytes, oriented)
        await util.promisify(stream.pipeline)(stream.Readable.from(oriented.content.reverse()), dest)
        return {
          mediaType: 'image/jpeg',
          sizeInBytes: 321321,
          dimensions: { width: 1000, height: 1200 },
        }
      })
      const oriented = await orientAttachmentImage(obsBefore, att.id, imageService, attachmentStore, console)
      const orientedContent = stagedContent.tempLocation as BufferWriteable

      expect(oriented.patch).toEqual({ contentType: 'image/jpeg', size: 321321, width: 1000, height: 1200, oriented: true, contentLocator: att.contentLocator! })
      expect(orientedContent.content).toEqual(Buffer.from('photo of penguins'))
      expect(imageService.autoOrient).toHaveBeenCalledOnceWith(jasmine.objectContaining({ bytes: originalConstentStream }), stagedContent.tempLocation)
      expect(attachmentStore.saveContent).toHaveBeenCalledOnceWith(stagedContent, att.id, obsBefore)
      expect(obsRepo.patchAttachment).not.toHaveBeenCalled()
      expect(obsRepo.save).not.toHaveBeenCalled()
    })

    it('does not produce an attachment patch if the content does not exist', async () => {

      const att: Attachment = Object.freeze({
        id: '1.123.1',
        observationFormId: 'form1',
        fieldName: 'field1',
        oriented: false,
        thumbnails: [],
        contentType: 'image/jpeg',
        name: 'test1.jpeg',
        size: 320000,
        contentLocator: String(Date.now())
      })
      const obsBefore: Observation = observationWithAttachments('1.123', event1, [ att ])
      const obsRepo = observationRepos.get(event1.id)!
      attachmentStore.readContent.and.resolveTo(null)
      const oriented = await orientAttachmentImage(obsBefore, att.id, imageService, attachmentStore, console)

      expect(oriented.patch).toBeUndefined()
      expect(imageService.autoOrient).not.toHaveBeenCalled()
      expect(attachmentStore.saveContent).not.toHaveBeenCalled()
      expect(obsRepo.patchAttachment).not.toHaveBeenCalled()
      expect(obsRepo.save).not.toHaveBeenCalled()
    })

    it('does not produce an attachment patch if reading content fails', async () => {

      const att: Attachment = Object.freeze({
        id: '1.123.1',
        observationFormId: 'form1',
        fieldName: 'field1',
        oriented: false,
        thumbnails: [],
        contentType: 'image/jpeg',
        name: 'test1.jpeg',
        size: 320000,
        contentLocator: String(Date.now())
      })
      const obsBefore: Observation = observationWithAttachments('1.123', event1, [ att ])
      const obsRepo = observationRepos.get(event1.id)!
      attachmentStore.readContent.and.resolveTo(new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound))
      const oriented = await orientAttachmentImage(obsBefore, att.id, imageService, attachmentStore, console)

      expect(oriented.patch).toBeUndefined()
      expect(imageService.autoOrient).not.toHaveBeenCalled()
      expect(attachmentStore.saveContent).not.toHaveBeenCalled()
      expect(obsRepo.patchAttachment).not.toHaveBeenCalled()
      expect(obsRepo.save).not.toHaveBeenCalled()
    })

    it('does not produce an attachment patch if the image service cannot decode the image', async () => {

      const att: Attachment = Object.freeze({
        id: '1.123.1',
        observationFormId: 'form1',
        fieldName: 'field1',
        oriented: false,
        thumbnails: [],
        contentType: 'image/jpeg',
        name: 'test1.jpeg',
        size: 320000,
        contentLocator: String(Date.now())
      })
      const obsBefore: Observation = observationWithAttachments('1.123', event1, [ att ])
      const obsRepo = observationRepos.get(event1.id)!
      attachmentStore.readContent.and.resolveTo(stream.Readable.from(Buffer.from('corrupted image')))
      const staged: StagedAttachmentContent = {
        id: 'nawgonwork',
        tempLocation: jasmine.createSpyObj<NodeJS.WritableStream>(
          'mockPendingContent',
          [ 'write', 'end' ]
        )
      }
      attachmentStore.stagePendingContent.and.resolveTo(staged)
      imageService.autoOrient.and.resolveTo(new Error('wut is this'))
      const oriented = await orientAttachmentImage(obsBefore, att.id, imageService, attachmentStore, console)

      expect(oriented.patch).toBeUndefined()
      expect(attachmentStore.saveContent).not.toHaveBeenCalled()
      expect(staged.tempLocation.write).not.toHaveBeenCalled()
      expect(obsRepo.patchAttachment).not.toHaveBeenCalled()
      expect(obsRepo.save).not.toHaveBeenCalled()
    })

    it('patches the attachment even if saving content did not change attachment meta-data')
    it('does not patch the attachment if saving content failed')
  })

  describe('thumbnail phase', () => {

    it('generates the specified thumbnails and produces the attachment patch', async () => {

      const att: Attachment = Object.freeze({
        id: '1.456.1',
        observationFormId: 'form1',
        fieldName: 'field1',
        contentType: 'image/png',
        name: 'test1.jpg',
        size: 987789,
        width: 1200,
        height: 1600,
        oriented: true,
        contentLocator: String(Date.now()),
        thumbnails: [],
      })
      class ExpectedThumb {
        readonly stagedContent: StagedAttachmentContent
        constructor(readonly metaData: Thumbnail, stagedContentId: StagedAttachmentContentId) {
          this.stagedContent = new StagedAttachmentContent(stagedContentId, new BufferWriteable())
        }
        get stagedContentBytes(): Buffer { return (this.stagedContent.tempLocation as BufferWriteable).content }
      }
      const salt = String(Date.now())
      const expectedThumbs = new Map<number, ExpectedThumb>()
        .set(60, new ExpectedThumb(
          { minDimension: 60, size: 6000, width: 60, height: 80, name: 'test1-60.jpg', contentType: 'image/jpeg', contentLocator: `${att.contentLocator}-60` },
          `${salt}-staged-60`))
        .set(120, new ExpectedThumb(
          { minDimension: 120, size: 12000, width: 120, height: 160, name: 'test1-120.jpg', contentType: 'image/jpeg', contentLocator: `${att.contentLocator}-120` },
          `${salt}-staged-120`))
        .set(240, new ExpectedThumb(
          { minDimension: 240, size: 24000, width: 240, height: 320, name: 'test1-240.jpg', contentType: 'image/jpeg', contentLocator: `${att.contentLocator}-240` },
          `${salt}-staged-240`))
      const obsRepo = observationRepos.get(event1.id)!
      const obsBefore: Observation = observationWithAttachments('1.123', event1, [ att ])
      const obsStaged: Observation = patchAttachment(obsBefore, att.id,
        { thumbnails: Array.from(expectedThumbs.values()).map(x => _.omit(copyThumbnailAttrs(x.metaData), 'contentLocator')) }) as Observation
      const attachmentContent = Buffer.from('big majestic mountains')
      const stagedContentStack = [ expectedThumbs.get(240)?.stagedContent, expectedThumbs.get(120)?.stagedContent, expectedThumbs.get(60)?.stagedContent ]
      attachmentStore.readContent.and.callFake(async _ => stream.Readable.from(attachmentContent))
      attachmentStore.stagePendingContent.and.callFake(async () => stagedContentStack.pop()!)
      attachmentStore.saveThumbnailContent.and.callFake(async (content, minDimension) => {
        return expectedThumbs.get(minDimension)!.metaData as ThumbnailContentPatchAttrs
      })
      imageService.scaleToDimension.and.callFake(async (minDimension, source, dest) => {
        const sourceStream = new BufferWriteable()
        await util.promisify(stream.pipeline)(source.bytes, sourceStream)
        const thumbContent = Buffer.from(`${sourceStream.content.toString()} @${minDimension}`)
        await util.promisify(stream.pipeline)(stream.Readable.from(thumbContent), dest)
        return {
          dimensions: { width: minDimension, height: minDimension * 4 / 3 },
          mediaType: 'image/jpeg',
          sizeInBytes: minDimension * 100
        }
      })

      const thumbResult = await thumbnailAttachmentImage(obsBefore, att.id, [ 60, 120, 240 ], imageService, attachmentStore, console)
      expect(thumbResult.patch).toEqual({ thumbnails: Array.from(expectedThumbs.values()).map(x => x.metaData) })
      expect(expectedThumbs.get(60)?.stagedContentBytes.toString()).toEqual('big majestic mountains @60')
      expect(expectedThumbs.get(120)?.stagedContentBytes.toString()).toEqual('big majestic mountains @120')
      expect(expectedThumbs.get(240)?.stagedContentBytes.toString()).toEqual('big majestic mountains @240')
      expect(attachmentStore.stagePendingContent).toHaveBeenCalledTimes(3)
      expect(attachmentStore.readContent).toHaveBeenCalledTimes(3)
      expect(attachmentStore.readContent.calls.argsFor(0)).toEqual([ att.id, obsBefore ])
      expect(attachmentStore.readContent.calls.argsFor(1)).toEqual([ att.id, obsBefore ])
      expect(attachmentStore.readContent.calls.argsFor(2)).toEqual([ att.id, obsBefore ])
      expect(imageService.scaleToDimension).toHaveBeenCalledTimes(3)
      expect(imageService.scaleToDimension).toHaveBeenCalledWith(60, jasmine.anything(), jasmine.anything())
      expect(imageService.scaleToDimension).toHaveBeenCalledWith(120, jasmine.anything(), jasmine.anything())
      expect(imageService.scaleToDimension).toHaveBeenCalledWith(240, jasmine.anything(), jasmine.anything())
      expect(attachmentStore.saveThumbnailContent).toHaveBeenCalledTimes(3)
      expect(attachmentStore.saveThumbnailContent).toHaveBeenCalledWith(expectedThumbs.get(60)?.stagedContent, 60, att.id, sameAsObservationWithoutDates(obsStaged))
      expect(attachmentStore.saveThumbnailContent).toHaveBeenCalledWith(expectedThumbs.get(120)?.stagedContent, 120, att.id, sameAsObservationWithoutDates(obsStaged))
      expect(attachmentStore.saveThumbnailContent).toHaveBeenCalledWith(expectedThumbs.get(240)?.stagedContent, 240, att.id, sameAsObservationWithoutDates(obsStaged))
      expect(attachmentStore.saveContent).not.toHaveBeenCalled()
      expect(obsRepo.patchAttachment).not.toHaveBeenCalled()
      expect(obsRepo.save).not.toHaveBeenCalled()
    })

    it('does not destroy existing thumbnail meta-data during update')
  })

  describe('automated processing', () => {

    class TestPluginStateRepository implements PluginStateRepository<ImagePluginConfig> {
      state: ImagePluginConfig | null = null
      async get(): Promise<ImagePluginConfig | null> {
        return this.state
      }
      async put(x: ImagePluginConfig): Promise<ImagePluginConfig> {
        this.state = { ...x }
        return this.state
      }
      async patch(state: Partial<ImagePluginConfig>): Promise<ImagePluginConfig> {
        throw new Error('unimplemented')
      }
    }
    let stateRepo: TestPluginStateRepository
    let attachmentQuery: jasmine.Spy<FindUnprocessedImageAttachments>
    let clock: jasmine.Clock

    beforeEach(async () => {
      stateRepo = new TestPluginStateRepository()
      attachmentQuery = jasmine.createSpy('attachmentQuery')
      clock = jasmine.clock().install()
    })

    afterEach(() => {
      clock.uninstall()
    })

    describe('plugin control', () => {

      describe('stopping', () => {

        it('waits for the current processing interval to finish then stops', async () => {

          stateRepo.state = { ...defaultImagePluginConfig, intervalSeconds: 10 }
          const clockTickMillis = stateRepo.state.intervalSeconds * 1000 + 1
          attachmentQuery.and.resolveTo(asyncIterableOf([]))
          const plugin = await createImagePluginControl(stateRepo, eventRepo, observationRepoForEvent, attachmentStore, attachmentQuery, imageService, console)
          plugin.start()
          clock.tick(clockTickMillis)
          await plugin.stop()
          clock.tick(clockTickMillis)
          clock.tick(clockTickMillis)
          await new Promise(resolve => {
            setTimeout(resolve)
            clock.tick(clockTickMillis)
          })

          expect(attachmentQuery).toHaveBeenCalledTimes(1)
        })
      })

      it('begins processing for the default configuration when no saved configuration exists', async () => {

        const clockTickMillis = defaultImagePluginConfig.intervalSeconds * 1000 + 1
        attachmentQuery.and.resolveTo(asyncIterableOf([]))
        const plugin = await createImagePluginControl(stateRepo, eventRepo, observationRepoForEvent, attachmentStore, attachmentQuery, imageService, console)
        plugin.start()
        clock.tick(clockTickMillis)
        await plugin.stop()
        clock.tick(clockTickMillis)
        clock.tick(clockTickMillis)
        await new Promise(resolve => {
          setTimeout(resolve)
          clock.tick(clockTickMillis)
        })

        expect(stateRepo.state).toEqual({ ...defaultImagePluginConfig })
        expect(attachmentQuery).toHaveBeenCalledTimes(1)
      })

      it('begins processing for the saved config', async () => {

        const config: ImagePluginConfig = {
          ...defaultImagePluginConfig,
          intervalSeconds: defaultImagePluginConfig.intervalSeconds * 2
        }
        stateRepo.state = config
        attachmentQuery.and.resolveTo(asyncIterableOf([]))
        const plugin = await createImagePluginControl(stateRepo, eventRepo, observationRepoForEvent, attachmentStore, attachmentQuery, imageService, console)
        plugin.start()
        clock.tick(defaultImagePluginConfig.intervalSeconds * 1000 + 1)

        expect(attachmentQuery).not.toHaveBeenCalled()

        clock.tick(defaultImagePluginConfig.intervalSeconds * 1000)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(1)

        clock.tick(defaultImagePluginConfig.intervalSeconds * 1000 + 1)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(1)

        await plugin.stop()
        clock.tick(config.intervalSeconds * 1000)
        await someRunLoops()
        clock.tick(config.intervalSeconds * 1000)
        await someRunLoops()

        expect(stateRepo.state).toEqual({ ...config })
        expect(attachmentQuery).toHaveBeenCalledTimes(1)
      })

      it('fetches the plugin config from the plugin state repo', async () => {

        const app = await createImagePluginControl(stateRepo, eventRepo, observationRepoForEvent, attachmentStore, attachmentQuery, imageService, console)
        const config: ImagePluginConfig = {
          enabled: false,
          intervalBatchSize: 10,
          intervalSeconds: 100,
          thumbnailSizes: []
        }
        stateRepo.state = config
        const fetched = await app.getConfig()

        expect(fetched).toEqual({ ...config })
      })

      it('saves a new configuration and restarts automatic processing', async () => {

        attachmentQuery.and.resolveTo(asyncIterableOf([]))
        const plugin = await createImagePluginControl(stateRepo, eventRepo, observationRepoForEvent, attachmentStore, attachmentQuery, imageService, console)
        plugin.start()
        clock.tick(defaultImagePluginConfig.intervalSeconds * 1000)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(1)

        attachmentQuery.and.returnValue(new Promise(resolve => {
          setTimeout(() => resolve(asyncIterableOf([])), defaultImagePluginConfig.intervalSeconds * 1000 + 100)
        }))
        clock.tick(defaultImagePluginConfig.intervalSeconds * 1000)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(2)

        const configMod: ImagePluginConfig = {
          ...defaultImagePluginConfig,
          intervalSeconds: defaultImagePluginConfig.intervalSeconds * 2
        }
        plugin.applyConfig(configMod)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(2)

        clock.tick(100)
        await someRunLoops()

        expect(attachmentQuery).toHaveBeenCalledTimes(3)

        await plugin.stop()
        clock.tick(configMod.intervalSeconds * 1000)
        await someRunLoops()
        clock.tick(configMod.intervalSeconds * 1000)
        await someRunLoops()

        expect(stateRepo.state).toEqual({ ...configMod })
        expect(attachmentQuery).toHaveBeenCalledTimes(3)
      })
    })
  })

  it('queries for attachments based on last latest process time of each event and start time of interval', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: allEvents.get(1)!, latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 5 },
      { event: allEvents.get(2)!, latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 2 }
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginConfig = {
      enabled: true,
      intervalBatchSize: 1000,
      intervalSeconds: 60,
      thumbnailSizes: []
    }
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findAttachments').and.resolveTo(asyncIterableOf([]))
    await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore, console)

    expect(findUnprocessedAttachments).toHaveBeenCalledOnceWith(
      Array.from(eventProcessingStates.values()), null, closeToNow(), pluginState.intervalBatchSize)
  })

  it('returns the timestamps of the latest attachments processed for each event', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: copyMageEventAttrs(event1), latestAttachmentProcessedTimestamp: minutesAgo(5) },
      { event: copyMageEventAttrs(event2), latestAttachmentProcessedTimestamp: minutesAgo(4) },
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginConfig = {
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
      repo.findById.and.callFake(async id => eventObservations.get(eventId)?.find(x => x.id === id) || null)
      repo.patchAttachment.and.callFake(async o => o)
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
    const stagedContent = new StagedAttachmentContent('staged attachment', new BufferWriteable())
    attachmentStore.readContent.and.resolveTo(stream.Readable.from(Buffer.from('original content')))
    attachmentStore.stagePendingContent.and.resolveTo(stagedContent)
    attachmentStore.saveContent.and.resolveTo(null)
    attachmentStore.saveThumbnailContent.and.resolveTo(null)
    const processedEventStates = await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore, console)

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
    const pluginState: ImagePluginConfig = {
      enabled: true,
      intervalSeconds: 60,
      intervalBatchSize: 1000,
      thumbnailSizes: [ 60, 120 ]
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
      async *[Symbol.asyncIterator](): AsyncGenerator<TestUnprocessed> {
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
    attachmentStore.readContent.and.resolveTo(stream.Readable.from(Buffer.from(new Date().toISOString())))
    attachmentStore.stagePendingContent.and.callFake(async () => ({
      tempLocation: new BufferWriteable(),
      id: failNextIfCurrentNotProcessed.current!.attachmentId
    }))
    imageService.autoOrient.and.callFake(async (source: ImageContent, dest: NodeJS.WritableStream) => {
      return await Promise.resolve<Required<ImageDescriptor>>({
        mediaType: `image/png`,
        dimensions: { width: 100 * (failNextIfCurrentNotProcessed.cursor + 1), height: 120 * (failNextIfCurrentNotProcessed.cursor + 1) },
        sizeInBytes: 1000 * (failNextIfCurrentNotProcessed.cursor + 1)
      })
    })
    imageService.scaleToDimension.and.callFake(async minDimension => {
      failNextIfCurrentNotProcessed.processCurrent()
      return { mediaType: 'image/jpeg', sizeInBytes: minDimension * 1000, dimensions: { width: minDimension, height: minDimension * 1.5 }}
    })
    observationRepos.forEach((repo, eventId) => {
      repo.findById.and.callFake(async id => eventObservations.get(eventId)!.find(x => x.id === id) || null)
      repo.patchAttachment.and.callFake(async (obs) => eventObservations.get(obs.eventId)!.find(x => x.id === obs.id)!)
    })
    attachmentStore.saveContent.and.resolveTo(null)
    attachmentStore.saveThumbnailContent.and.resolveTo(null)

    await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore, console)

    expect(imageService.autoOrient).toHaveBeenCalledTimes(unprocessedAttachments.length)
    for (const a of unprocessedAttachments) {
      expect(a.processed).toBe(true)
    }
  })

  it('marks attachment oriented when orient phase does not produce a patch', async () => {

    const eventProcessingStates = new Map<MageEventId, EventProcessingState>([
      { event: copyMageEventAttrs(event1), latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 5 },
      { event: copyMageEventAttrs(event2), latestAttachmentProcessedTimestamp: Date.now() - 1000 * 60 * 2 },
    ].map(x => [ x.event.id, x ]))
    const pluginState: ImagePluginConfig = {
      enabled: true,
      intervalSeconds: 60,
      intervalBatchSize: 1000,
      thumbnailSizes: []
    }
    const attachment1: Attachment = {
      id: '1.100.1',
      fieldName: 'field1',
      lastModified: new Date(minutesAgo(6)),
      observationFormId: 'form1',
      oriented: false,
      thumbnails: [],
    }
    const attachment2: Attachment = {
      id: '2.200.1',
      fieldName: 'field1',
      lastModified: new Date(),
      observationFormId: 'form1',
      oriented: false,
      thumbnails: []
    }
    const obs1 = observationWithAttachments('1.100', event1, [ attachment1 ])
    const obs2 = observationWithAttachments('2.200', event2, [ attachment2 ])
    const unprocessedAttachments: UnprocessedAttachmentReference[] = [
      { eventId: obs1.eventId, observationId: obs1.id, attachmentId: attachment1.id },
      { eventId: obs2.eventId, observationId: obs2.id, attachmentId: attachment2.id }
    ]
    const findUnprocessedAttachments = jasmine.createSpy<FindUnprocessedImageAttachments>('findAttachments')
      .and.resolveTo(asyncIterableOf(unprocessedAttachments))
    const invalidImageBytes = stream.Readable.from(Buffer.from('wut is this'))
    const validImageBytes = stream.Readable.from(Buffer.from('goats.png'))
    observationRepos.get(event1.id)?.findById.withArgs(obs1.id).and.resolveTo(obs1)
    observationRepos.get(event2.id)?.findById.withArgs(obs2.id).and.resolveTo(obs2)
    observationRepos.get(event1.id)?.patchAttachment.and.resolveTo(obs1)
    observationRepos.get(event2.id)?.patchAttachment.and.resolveTo(obs2)
    attachmentStore.readContent.withArgs(jasmine.stringMatching(attachment1.id), jasmine.anything()).and.resolveTo(invalidImageBytes)
    attachmentStore.readContent.withArgs(jasmine.stringMatching(attachment2.id), jasmine.anything()).and.resolveTo(validImageBytes)
    attachmentStore.stagePendingContent.and.resolveTo({
      tempLocation: new BufferWriteable(),
      id: 'pending'
    })
    imageService.autoOrient.and.callFake(async (source: ImageContent, dest: NodeJS.WritableStream) => {
      if (source.bytes === invalidImageBytes) {
        return new Error('bad image data')
      }
      return await Promise.resolve<Required<ImageDescriptor>>({
        mediaType: `image/png`,
        dimensions: { width: 100, height: 120 },
        sizeInBytes: 10000
      })
    })
    await processImageAttachments(pluginState, eventProcessingStates,
      findUnprocessedAttachments, imageService, eventRepo, observationRepoForEvent, attachmentStore, console)

    expect(observationRepos.get(event1.id)?.patchAttachment).toHaveBeenCalledOnceWith(obs1, attachment1.id, { oriented: true })
    expect(observationRepos.get(event2.id)?.patchAttachment).toHaveBeenCalledOnceWith(obs2, attachment2.id, {
      oriented: true,
      contentType: 'image/png',
      size: 10000,
      width: 100,
      height: 120,
    })
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

  async stagePendingContent(): Promise<StagedAttachmentContent> {
    const id = `pending::${this.nextPendingId++}`
    const tempLocation = new BufferWriteable()
    const pending: StagedAttachmentContent = {
      id,
      tempLocation: tempLocation.on('finish', () => {
        this.pendingContent.set(id, tempLocation.content)
      })
    }
    this.pendingContent.set(id, Buffer.alloc(0))
    return pending
  }
  async saveContent(content: NodeJS.ReadableStream | StagedAttachmentContent, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | AttachmentContentPatchAttrs | null> {
    if (typeof content !== 'string') {
      return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, 'this store supports saving only staged content')
    }
    const att = observation.attachmentFor(attachmentId)
    if (!att) {
      return new AttachmentStoreError(AttachmentStoreErrorCode.InvalidAttachmentId)
    }
    const pendingBytes = this.pendingContent.get(content)
    if (!pendingBytes) {
      return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, `pending content not found: ${content}`)
    }
    const key = AttachmentContentKey(attachmentId, observation.id)
    this.pendingContent.delete(content)
    this.attachmentContent.set(key, pendingBytes)
    return { contentLocator: key, size: pendingBytes.length }
  }
  async saveThumbnailContent(content: NodeJS.ReadableStream | StagedAttachmentContentId, minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | ThumbnailContentPatchAttrs | null> {
    if (typeof content !== 'string') {
      return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, 'this store supports saving only staged content')
    }
    const att = observation.attachmentFor(attachmentId)
    if (!att) {
      return new AttachmentStoreError(AttachmentStoreErrorCode.InvalidAttachmentId)
    }
    const pendingBytes = this.pendingContent.get(content)
    if (!pendingBytes) {
      return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound, `pending content not found: ${content}`)
    }
    const thumb = att.thumbnails.find(x => x.minDimension === minDimension)
    const key = ThumbnailContentKey(minDimension, attachmentId, observation.id)
    this.pendingContent.delete(content)
    this.thumbnailContent.set(key, pendingBytes)
    return { ...thumb, minDimension, contentLocator: key, size: pendingBytes.length }
  }
  async readContent(attachmentId: AttachmentId, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    const key = AttachmentContentKey(attachmentId, observation.id)
    const bytes = this.attachmentContent.get(key)
    if (bytes) {
      return stream.Readable.from(bytes)
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound)
  }
  async readThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError> {
    const key = ThumbnailContentKey(minDimension, attachmentId, observation.id)
    const bytes = this.thumbnailContent.get(key)
    if (bytes) {
      return stream.Readable.from(bytes)
    }
    return new AttachmentStoreError(AttachmentStoreErrorCode.ContentNotFound)
  }
  deleteContent(attachment: Attachment, observation: Observation): Promise<AttachmentStoreError | AttachmentPatchAttrs | null> {
    throw new Error('Method not implemented.')
  }
  deleteThumbnailContent(minDimension: number, attachmentId: string, observation: Observation): Promise<AttachmentStoreError | null> {
    throw new Error('Method not implemented.')
  }
}

/**
 * Let the main run loop process the microtask queue for a bit.  This is about
 * as dirty and reliable as a thread sleep, but blackbox testing repeating
 * timeout intervals is hard, so deal with it (•_•) ( •_•)>⌐■-■ (⌐■_■)
 * @param count
 * @returns
 */
function someRunLoops(count = 100): Promise<void> {
  return new Promise(function waitRemaining(resolve: () => any, reject: (err: any) => any, remaining: number = count) {
    if (remaining === 0) {
      return resolve()
    }
    process.nextTick(() => waitRemaining(resolve, reject, remaining - 1))
  })
}