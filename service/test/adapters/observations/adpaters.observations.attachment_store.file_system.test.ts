import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'
import { FileSystemAttachmentStore, intializeAttachmentStore } from '../../../lib/adapters/observations/adpaters.observations.attachment_store.file_system'
import { Attachment, AttachmentId, copyObservationAttrs, Observation, ObservationAttrs, copyAttachmentAttrs, patchAttachment, putAttachmentThumbnailForMinDimension, copyThumbnailAttrs, Thumbnail } from '../../../lib/entities/observations/entities.observations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import uniqid from 'uniqid'
import _ from 'lodash'

const baseDirPath = path.resolve(`${__filename}.data`)
const pendingDirPath = path.resolve(baseDirPath, 'pending')

describe.only('file system attachment store', function() {

  let store: FileSystemAttachmentStore
  let obs: Observation
  let att: Attachment

  beforeEach(async function() {
    store = await intializeAttachmentStore(baseDirPath) as FileSystemAttachmentStore
    const event = new MageEvent({
      id: 1,
      name: 'Attachment Store Test',
      style: {},
      acl: {},
      feedIds: [],
      layerIds: [],
      forms: [
        {
          id: 1,
          name: 'Form 1',
          archived: false,
          color: '#123456',
          userFields: [],
          fields: [
            {
              id: 1,
              name: 'field1',
              title: 'Field 1',
              type: FormFieldType.Attachment,
              required: false,
            }
          ]
        }
      ]
    })
    const attrs: ObservationAttrs = {
      id: 'observation1',
      eventId: 1,
      createdAt: new Date('2022-03-09'),
      lastModified: new Date(),
      states: [],
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [ 12, 34 ] },
      properties: {
        timestamp: new Date(),
        forms: [
          {
            id: 'entry1',
            formId: 1
          }
        ]
      },
      attachments: [
        {
          id: 'attachment1',
          fieldName: 'field1',
          observationFormId: 'entry1',
          oriented: false,
          thumbnails: [],
          name: 'attachment_store.test'
        }
      ]
    }
    obs = Observation.evaluate(attrs, event)
    att = obs.attachments[0]
  })

  afterEach(async function() {
    const rm = util.promisify(fs.rm)
    await rm(baseDirPath, { force: true, recursive: true })
  })

  describe('initialization', function() {

    it('creates the base and pending directories if they do not exist', async function() {

      const stat = util.promisify(fs.stat)
      const baseDirStats = await stat(baseDirPath)
      const pendingDirStats = await stat(pendingDirPath)

      expect(baseDirStats.isDirectory()).to.be.true
      expect(pendingDirStats.isDirectory()).to.be.true
    })

    it('succeeds if the directories already exist', async function() {

      const retainedFilePath = path.join(baseDirPath, 'retained.txt')
      const retainedFileContent = stream.Readable.from(Buffer.from('save me'))
      const retainedFileOut = fs.createWriteStream(retainedFilePath)
      await util.promisify(stream.pipeline)(retainedFileContent, retainedFileOut)
      const anotherStore = await intializeAttachmentStore(baseDirPath)
      const afterInitRetainedContent = await util.promisify(fs.readFile)(retainedFilePath)

      expect(afterInitRetainedContent.toString()).to.equal('save me')
    })
  })

  describe('staging pending content', function() {

    it('creates an output stream to a file in the pending directory', async function() {

      const pending = await store.stagePendingContent()
      const content = stream.Readable.from(Buffer.from('such good content'))
      await util.promisify(stream.pipeline)(content, pending.tempLocation)
      const writtenBytes = await util.promisify(fs.readFile)(path.join(pendingDirPath, pending.id as string))
      const writtenContent = writtenBytes.toString()

      expect(writtenContent).to.equal('such good content')
    })
  })

  describe('saving content', function() {

    let contentBaseRelPath: string
    let contentBaseAbsPath: string

    beforeEach(function() {

      contentBaseRelPath = path.join(
        `event-${obs.eventId}`,
        String(obs.createdAt.getUTCFullYear()),
        String(obs.createdAt.getUTCMonth() + 1).padStart(2, '0'),
        String(obs.createdAt.getUTCDate()).padStart(2, '0'),
        obs.id,
        att.id)
      contentBaseAbsPath = path.join(baseDirPath, contentBaseRelPath)
    })

    describe('for attachments', function() {

      describe('from a direct stream', function() {

        it('saves the content to the permanent location', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const saveResult = await store.saveContent(content, att.id, obs)
          const absPath = path.resolve(baseDirPath, contentBaseRelPath)
          const stats = fs.statSync(absPath)
          const savedContent = fs.readFileSync(absPath)

          expect(saveResult).to.be.instanceOf(Observation)
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('overwrites existing content', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const saveResult1 = await store.saveContent(content, att.id, obs)
          const betterContent = stream.Readable.from(Buffer.from('even better content'))
          const saveResult2 = await store.saveContent(betterContent, att.id, obs)
          const stats = fs.statSync(contentBaseAbsPath)
          const savedContent = fs.readFileSync(contentBaseAbsPath)

          expect(saveResult1).to.be.instanceOf(Observation)
          expect(saveResult2).to.be.instanceOf(Observation)
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })

        it('assigns a content locator to an attachment without a content locator', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const mod = await store.saveContent(content, att.id, obs) as Observation
          const modAtt = mod.attachmentFor(att.id) as Attachment
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(mod).to.be.instanceOf(Observation)
          expect(mod).not.to.equal(obs)
          expect(modAtt).to.deep.include({ ..._.omit(copyAttachmentAttrs(att), 'lastModified'), contentLocator: contentBaseRelPath })
          expect(modAtt.lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          obs = patchAttachment(obs, att.id, { contentLocator }) as Observation
          const content = stream.Readable.from(Buffer.from('already located'))
          const saveResult = await store.saveContent(content, att.id, obs)
          const saved = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(saveResult).to.be.null
          expect(saved.toString()).to.equal('already located')
        })
      })

      describe('from staged content', function() {

        it('saves the content to the permanent location', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, staged.tempLocation)
          const saveResult = await store.saveContent(staged.id, att.id, obs)
          const absPath = path.resolve(baseDirPath, contentBaseRelPath)
          const stats = fs.statSync(absPath)
          const savedContent = fs.readFileSync(absPath)

          expect(saveResult).to.be.instanceOf(Observation)
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('overwrites existing content', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const staged1 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, staged1.tempLocation)
          const saveResult1 = await store.saveContent(staged1.id, att.id, obs)
          const betterContent = stream.Readable.from(Buffer.from('even better content'))
          const staged2 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(betterContent, staged2.tempLocation)
          const saveResult2 = await store.saveContent(staged2.id, att.id, obs)
          const stats = fs.statSync(contentBaseAbsPath)
          const savedContent = fs.readFileSync(contentBaseAbsPath)

          expect(saveResult1).to.be.instanceOf(Observation)
          expect(saveResult2).to.be.instanceOf(Observation)
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })

        it('assigns a content locator to an attachment without a content locator', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, staged.tempLocation)
          const mod = await store.saveContent(staged.id, att.id, obs) as Observation
          const modAtt = mod.attachmentFor(att.id) as Attachment
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(mod).to.be.instanceOf(Observation)
          expect(mod).not.to.equal(obs)
          expect(modAtt).to.deep.include({ ..._.omit(copyAttachmentAttrs(att), 'lastModified'), contentLocator: contentBaseRelPath })
          expect(modAtt.lastModified?.getTime()).to.be.closeTo(Date.now(), 100)
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          obs = patchAttachment(obs, att.id, { contentLocator }) as Observation
          const content = stream.Readable.from(Buffer.from('already located'))
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, staged.tempLocation)
          const saveResult = await store.saveContent(staged.id, att.id, obs)
          const saved = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(saveResult).to.be.null
          expect(saved.toString()).to.equal('already located')
        })

        it('TODO: returns an error if moving the staged content to the permanent path fails')
      })

      it('TODO: returns an error if creating the destination directory fails')
      it('TODO: returns an error if the observation does not have the attachment id')

      it('TODO: does not write outside the base directory if the content locator is an absolute path', async function() {
        expect.fail('todo')
      })

      it('TODO: does not write outside the base directory if the content locator references the parent directory', async function() {
        expect.fail('todo')
      })
    })

    describe('for thumbnails', function() {

      beforeEach(function() {

        obs = patchAttachment(obs, att.id, {
          thumbnails: [
            { minDimension: 120 },
            { minDimension: 240 },
          ]
        }) as Observation
        att = obs.attachmentFor(att.id) as Attachment
      })

      describe('from a direct stream', function() {

        it('saves thumbnails for a given size', async function() {

          const content120 = stream.Readable.from(Buffer.from('thumb 120'))
          const content240 = stream.Readable.from(Buffer.from('thumb 240'))
          const result120 = await store.saveThumbnailContent(content120, 120, att.id, obs)
          const result240 = await store.saveThumbnailContent(content240, 240, att.id, obs)
          const thumb120Path = `${contentBaseAbsPath}-120`
          const thumb240Path = `${contentBaseAbsPath}-240`
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(result120).to.be.instanceOf(Observation)
          expect(saved120.toString()).to.equal('thumb 120')
          expect(result240).to.be.instanceOf(Observation)
          expect(saved240.toString()).to.equal('thumb 240')
        })

        it('assigns a content locator to a thumbnail without a content locator', async function() {

          const attBefore = copyAttachmentAttrs(att)
          const thumb120Before = attBefore.thumbnails.find(x => x.minDimension === 120)
          const content120 = stream.Readable.from(Buffer.from('thumb 120'))
          const result120 = await store.saveThumbnailContent(content120, 120, att.id, obs) as Observation
          const attAfter = copyAttachmentAttrs(result120.attachmentFor(att.id) as Attachment)
          const thumb120After = attAfter.thumbnails.find(x => x.minDimension === 120) as Thumbnail

          expect(result120).to.be.instanceOf(Observation)
          expect(result120).to.not.equal(obs)
          expect(thumb120Before).to.deep.equal(copyThumbnailAttrs({ minDimension: 120 }))
          expect(thumb120After).to.deep.equal({ ...thumb120Before, contentLocator: `${contentBaseRelPath}-120` })
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 120, contentLocator }) as Observation
          const content120 = stream.Readable.from(Buffer.from('thumb 120 located'))
          const result120 = await store.saveThumbnailContent(content120, 120, att.id, obs)
          const readContent120 = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(result120).to.be.null
          expect(readContent120.toString()).to.equal('thumb 120 located')
        })
      })

      describe('from staged content', function() {

        it('saves a thumbnail for a given size', async function() {

          const content120 = stream.Readable.from(Buffer.from('thumb 120'))
          const content240 = stream.Readable.from(Buffer.from('thumb 240'))
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content120, pending120.tempLocation)
          const pending240 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content240, pending240.tempLocation)
          const save120 = await store.saveThumbnailContent(pending120.id, 120, att.id, obs)
          const save240 = await store.saveThumbnailContent(pending240.id, 240, att.id, obs)
          const thumb120Path = `${contentBaseAbsPath}-120`
          const thumb240Path = `${contentBaseAbsPath}-240`
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(save120).to.be.instanceOf(Observation)
          expect(saved120.toString()).to.equal('thumb 120')
          expect(save240).to.be.instanceOf(Observation)
          expect(saved240.toString()).to.equal('thumb 240')
        })

        it('assigns a content locator to a thumbnail without a content locator', async function() {

          const attBefore = copyAttachmentAttrs(att)
          const thumb120Before = attBefore.thumbnails.find(x => x.minDimension === 120)
          const content120 = stream.Readable.from(Buffer.from('thumb 120'))
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content120, pending120.tempLocation)
          const result120 = await store.saveThumbnailContent(pending120.id, 120, att.id, obs) as Observation
          const attAfter = copyAttachmentAttrs(result120.attachmentFor(att.id) as Attachment)
          const thumb120After = attAfter.thumbnails.find(x => x.minDimension === 120) as Thumbnail

          expect(result120).to.be.instanceOf(Observation)
          expect(result120).to.not.equal(obs)
          expect(thumb120Before).to.deep.equal(copyThumbnailAttrs({ minDimension: 120 }))
          expect(thumb120After).to.deep.equal({ ...thumb120Before, contentLocator: `${contentBaseRelPath}-120` })
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 120, contentLocator }) as Observation
          const content120 = stream.Readable.from(Buffer.from('thumb 120 located'))
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content120, pending120.tempLocation)
          const result120 = await store.saveThumbnailContent(pending120.id, 120, att.id, obs)
          const readContent120 = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(result120).to.be.null
          expect(readContent120.toString()).to.equal('thumb 120 located')
        })
      })
    })
  })

  describe('reading', function() {

    const baseContent = 'big picture'
    const thumb100Content = 'x-small picture'
    const thumb300Content = 'small picture'

    beforeEach(async function() {

      obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 100, name: 'thumb100' }) as Observation
      obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 300, name: 'thumb300' }) as Observation
      await store.saveContent(stream.Readable.from(Buffer.from(baseContent)), att.id, obs)
      await store.saveThumbnailContent(stream.Readable.from(Buffer.from(thumb100Content)), 100, att.id, obs)
      await store.saveThumbnailContent(stream.Readable.from(Buffer.from(thumb300Content)), 300, att.id, obs)
    })

    it('provides a read stream of the content', async function() {

      const contentStream = await store.readContent(att.id, obs) as NodeJS.ReadableStream
      const readContent = new BufferWriteable()
      await util.promisify(stream.pipeline)(contentStream, readContent)

      expect(readContent.bytes.toString()).to.equal(baseContent)
    })

    it('supports reading a range of the content', async function() {

      const contentStream = await store.readContent(att.id, obs, { start: 4, end: 7 }) as NodeJS.ReadableStream
      const contentRead = new BufferWriteable()
      await util.promisify(stream.pipeline)(contentStream, contentRead)

      expect(contentRead.bytes.toString()).to.equal(baseContent.slice(4, 7 + 1))
    })

    it('provides a read stream of the thumbnail content at the given dimension', async function() {

      const thumb100Stream = await store.readThumbnailContent(100, att.id, obs) as NodeJS.ReadableStream
      const thumb100Read = new BufferWriteable()
      await util.promisify(stream.pipeline)(thumb100Stream, thumb100Read)
      const thumb300Stream = await store.readThumbnailContent(300, att.id, obs) as NodeJS.ReadableStream
      const thumb300Read = new BufferWriteable()
      await util.promisify(stream.pipeline)(thumb300Stream, thumb300Read)

      expect(thumb100Read.bytes.toString()).to.equal(thumb100Content)
      expect(thumb300Read.bytes.toString()).to.equal(thumb300Content)
    })

    it('uses the content locator property to read the attachment if present', async function() {

      const contentLocator = uniqid()
      const contentPath = path.join(baseDirPath, contentLocator)
      const contentIn = stream.Readable.from(Buffer.from('from content locator'))
      const contentOut = fs.createWriteStream(contentPath)
      await util.promisify(stream.pipeline)(contentIn, contentOut)
      obs = patchAttachment(obs, att.id, {
        contentLocator: contentLocator
      }) as Observation
      const readStream = await store.readContent(att.id, obs) as NodeJS.ReadableStream
      const readContent = new BufferWriteable()
      await util.promisify(stream.pipeline)(readStream, readContent)

      expect(readContent.bytes.toString()).to.equal('from content locator')
    })

    it('uses the content locator property to read the thumbnail', async function() {

      const contentLocator = uniqid()
      const contentPath = path.join(baseDirPath, contentLocator)
      const contentIn = stream.Readable.from(Buffer.from('from content locator'))
      const contentOut = fs.createWriteStream(contentPath)
      await util.promisify(stream.pipeline)(contentIn, contentOut)
      obs = putAttachmentThumbnailForMinDimension(obs, att.id, {
        minDimension: 120,
        contentLocator,
      }) as Observation
      const readStream = await store.readThumbnailContent(120, att.id, obs) as NodeJS.ReadableStream
      const readContent = new BufferWriteable()
      await util.promisify(stream.pipeline)(readStream, readContent)

      expect(readContent.bytes.toString()).to.equal('from content locator')
    })
  })

  describe('deleting', function() {

    describe('a single attachment', function() {
      it('TODO: deletes attachment content')
      it('TODO: deletes thumbnail content')
    })

    describe('all observation attachment content', function() {
      it('TODO: deletes all attachments and thumbnails across all form entries')
    })

    describe('thumbnail content', function() {
      it('TODO: may not be necessary')
    })
  })
})

class BufferWriteable extends stream.Writable {

  #bytes: Buffer = Buffer.alloc(0)

  constructor(opts?: stream.WritableOptions) {
    super({
      ...opts,
      write: (chunk: any, encoding: BufferEncoding, callback: (err?: any) => void) => {
        this.#bytes = Buffer.concat([ this.#bytes, chunk ])
        callback()
      }
    })
  }

  get bytes() {
    return this.#bytes
  }
}