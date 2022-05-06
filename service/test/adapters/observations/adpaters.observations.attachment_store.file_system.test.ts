import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'
import { FileSystemAttachmentStore, intializeAttachmentStore, relativePathForAttachment } from '../../../lib/adapters/observations/adpaters.observations.attachment_store.file_system'
import { Attachment, AttachmentId, Observation, ObservationAttrs } from '../../../lib/entities/observations/entities.observations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'

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
      createdAt: new Date(),
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
        String(obs.createdAt.getUTCMonth() + 1),
        String(obs.createdAt.getUTCDate()),
        obs.id,
        att.id)
      contentBaseAbsPath = path.join(baseDirPath, contentBaseRelPath)
    })

    describe('for attachments', function() {

      describe('from a direct stream', function() {

        it('saves the content directly to the permanent location', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const err = await store.saveContent(content, att.id, obs)
          const absPath = path.resolve(baseDirPath, contentBaseRelPath)
          const stats = await util.promisify(fs.stat)(absPath)
          const savedContent = await util.promisify(fs.readFile)(absPath)

          expect(err).to.be.null
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('overwrites existing content', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const err1 = await store.saveContent(content, att.id, obs)
          const betterContent = stream.Readable.from(Buffer.from('even better content'))
          const err2 = await store.saveContent(betterContent, att.id, obs)
          const stats = await util.promisify(fs.stat)(contentBaseAbsPath)
          const savedContent = await util.promisify(fs.readFile)(contentBaseAbsPath)

          expect(err1).to.be.null
          expect(err2).to.be.null
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })
      })

      describe('from staged content', function() {

        it('moves the staged content to the permanent location', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const pending = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, pending.tempLocation)
          const err = await store.saveContent(pending.id, att.id, obs)
          const stats = await util.promisify(fs.stat)(contentBaseAbsPath)
          const savedContent = fs.readFileSync(contentBaseAbsPath)
          const pendingDirEntries = fs.readdirSync(pendingDirPath)

          expect(err).to.be.null
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
          expect(pendingDirEntries).to.be.empty
        })

        it('overwrites existing content', async function() {

          const content = stream.Readable.from(Buffer.from('such good content'))
          const pending1 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(content, pending1.tempLocation)
          const err1 = await store.saveContent(pending1.id, att.id, obs)
          const betterContent = stream.Readable.from(Buffer.from('even better content'))
          const pending2 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(betterContent, pending2.tempLocation)
          const err2 = await store.saveContent(pending2.id, att.id, obs)
          const stats = await util.promisify(fs.stat)(contentBaseAbsPath)
          const savedContent = await util.promisify(fs.readFile)(contentBaseAbsPath)

          expect(err1).to.be.null
          expect(err2).to.be.null
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })

        it('returns an error if creating the destination directory fails')
        it('returns an error if moving the staged content to the permanent path fails')
      })

      it('returns an error if the observation does not have the attachment id')
    })

    describe('for thumbnails', function() {

      describe('from a direct stream', function() {

        it('saves thumbnails qualified with a given size', async function() {

          const content120 = stream.Readable.from(Buffer.from('thumb 120'))
          const content240 = stream.Readable.from(Buffer.from('thumb 240'))
          const err120 = await store.saveThumbnailContent(content120, 120, att.id, obs)
          const err240 = await store.saveThumbnailContent(content240, 240, att.id, obs)
          const thumb120Path = `${contentBaseAbsPath}-120`
          const thumb240Path = `${contentBaseAbsPath}-240`
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(err120).to.be.null
          expect(saved120.toString()).to.equal('thumb 120')
          expect(err240).to.be.null
          expect(saved240.toString()).to.equal('thumb 240')
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
          const err120 = await store.saveThumbnailContent(pending120.id, 120, att.id, obs)
          const err240 = await store.saveThumbnailContent(pending240.id, 240, att.id, obs)
          const thumb120Path = `${contentBaseAbsPath}-120`
          const thumb240Path = `${contentBaseAbsPath}-240`
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(err120).to.be.null
          expect(saved120.toString()).to.equal('thumb 120')
          expect(err240).to.be.null
          expect(saved240.toString()).to.equal('thumb 240')
        })
      })
    })
  })

  describe('reading', function() {

    const baseContent = 'big picture'
    const thumb100Content = 'x-small picture'
    const thumb300Content = 'small picture'

    beforeEach(async function() {

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
  })

  describe('deleting', function() {

    describe('all observation content', function() {

    })

    describe('base content', function() {

    })

    describe('thubnail content', function() {

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