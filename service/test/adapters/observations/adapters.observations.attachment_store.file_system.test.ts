import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import stream, { Readable } from 'stream'
import util from 'util'
import { FileSystemAttachmentStore, intializeAttachmentStore } from '../../../lib/adapters/observations/adapters.observations.attachment_store.file_system'
import { Attachment, AttachmentId, Observation, ObservationAttrs, copyAttachmentAttrs, patchAttachment, putAttachmentThumbnailForMinDimension, copyThumbnailAttrs, Thumbnail, AttachmentStoreError, StagedAttachmentContent, AttachmentContentPatchAttrs, ThumbnailContentPatchAttrs, removeAttachment, AttachmentPatchAttrs, AttachmentStoreErrorCode } from '../../../lib/entities/observations/entities.observations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'
import uniqid from 'uniqid'
import _ from 'lodash'
import { BufferWriteable } from '../../utils'
import mime from 'mime-types'

function contentLocatorOfAttachment(attId: AttachmentId, obs: Observation): string {
  const att = obs.attachmentFor(attId)
  if (!att) {
    throw new Error(`no attachment ${attId} on observation ${obs.id}`)
  }
  const ext = mime.extension(att.contentType || '')
  return path.join(
    `event-${obs.eventId}`,
    String(obs.createdAt.getUTCFullYear()),
    String(obs.createdAt.getUTCMonth() + 1).padStart(2, '0'),
    String(obs.createdAt.getUTCDate()).padStart(2, '0'),
    obs.id,
    attId + (ext ? `.${ext}` : ''))
}

function contentLocatorOfThumbnail(minDimension: number, attId: AttachmentId, obs: Observation): string {
  const attLocator = contentLocatorOfAttachment(attId, obs)
  const parts = path.parse(attLocator)
  return path.join(parts.dir, `${parts.name}-${minDimension}${parts.ext}`)
}

const baseDirPath = path.resolve(`${__filename}.data`)
const pendingDirPath = path.resolve(baseDirPath, 'pending')

describe('file system attachment store', function() {

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
      favoriteUserIds: [],
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
          name: 'attachment_store.mp4',
          contentType: 'video/mp4'
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

      expect(pending).to.be.instanceOf(StagedAttachmentContent)
      expect(writtenContent).to.equal('such good content')
    })
  })

  describe('saving content', function() {

    let contentBaseRelPath: string
    let contentBaseAbsPath: string

    beforeEach(function() {
      contentBaseRelPath = contentLocatorOfAttachment(att.id, obs)
      contentBaseAbsPath = path.join(baseDirPath, contentBaseRelPath)
    })

    describe('for attachments', function() {

      describe('from a direct stream', function() {

        it('saves the content to the permanent location', async function() {

          const content = Buffer.from('such good content')
          const saveResult = await store.saveContent(Readable.from(content), att.id, obs)
          const absPath = path.resolve(baseDirPath, contentBaseRelPath)
          const stats = fs.statSync(absPath)
          const savedContent = fs.readFileSync(absPath)

          expect(saveResult).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('overwrites existing content', async function() {

          const content = Buffer.from('such good content')
          const saveResult1 = await store.saveContent(Readable.from(content), att.id, obs)
          const betterContent = Buffer.from('even better content')
          const saveResult2 = await store.saveContent(Readable.from(betterContent), att.id, obs)
          const stats = fs.statSync(contentBaseAbsPath)
          const savedContent = fs.readFileSync(contentBaseAbsPath)

          expect(saveResult1).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(saveResult2).to.deep.equal({ contentLocator: contentBaseRelPath, size: betterContent.length })
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })

        it('returns null if the attachment size and content locator match', async function() {

          const content = Buffer.from('such good content')
          obs = patchAttachment(obs, att.id, { contentLocator: contentBaseRelPath, size: content.length }) as Observation
          att = obs.attachmentFor(att.id) as Attachment
          const patch = await store.saveContent(Readable.from(content), att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.be.null
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('returns an attachment content patch if the attachment did not have a content locator', async function() {

          const content = Buffer.from('such good content')
          obs = patchAttachment(obs, att.id, { size: content.length }) as Observation
          att = obs.attachmentFor(att.id) as Attachment
          const patch = await store.saveContent(Readable.from(content), att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(savedContent.toString()).to.equal('such good content')
        })


        it('returns an attachment content patch if the saved content size is different', async function() {

          obs = patchAttachment(obs, att.id, { size: 1 }) as Observation
          const bytes = Buffer.from(Array.from({ length: 20 }).map(x => 'photo of trees').join(' '))
          const contentStream = Readable.from(bytes)
          const patch = await store.saveContent(contentStream, att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.deep.equal({ contentLocator: contentBaseRelPath, size: bytes.length })
          expect(savedContent.toString()).to.equal(bytes.toString())
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          const content = Buffer.from('already located')
          obs = patchAttachment(obs, att.id, { contentLocator, size: content.length }) as Observation
          const saveResult = await store.saveContent(Readable.from(content), att.id, obs)
          const saved = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(saveResult).to.be.null
          expect(saved.toString()).to.equal('already located')
        })
      })

      describe('from staged content', function() {

        it('saves the content to the permanent location', async function() {

          const content = Buffer.from('such good content')
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged.tempLocation)
          const saveResult = await store.saveContent(staged, att.id, obs)
          const absPath = path.resolve(baseDirPath, contentBaseRelPath)
          const stats = fs.statSync(absPath)
          const savedContent = fs.readFileSync(absPath)

          expect(saveResult).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('overwrites existing content', async function() {

          const content = Buffer.from('such good content')
          const staged1 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged1.tempLocation)
          const saveResult1 = await store.saveContent(staged1, att.id, obs)
          const betterContent = Buffer.from('even better content')
          const staged2 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(betterContent), staged2.tempLocation)
          const saveResult2 = await store.saveContent(staged2, att.id, obs)
          const stats = fs.statSync(contentBaseAbsPath)
          const savedContent = fs.readFileSync(contentBaseAbsPath)

          expect(saveResult1).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(saveResult2).to.deep.equal({ contentLocator: contentBaseRelPath, size: betterContent.length  })
          expect(stats.isFile()).to.be.true
          expect(savedContent.toString()).to.equal('even better content')
        })

        it('returns null if the attachment size and content locator match', async function() {

          const content = Buffer.from('such good content')
          obs = patchAttachment(obs, att.id, { contentLocator: contentBaseRelPath, size: content.length }) as Observation
          att = obs.attachmentFor(att.id) as Attachment
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged.tempLocation)
          const patch = await store.saveContent(staged, att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.be.null
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('returns an attachment content patch if the attachment did not have a content locator', async function() {

          const content = Buffer.from('such good content')
          obs = patchAttachment(obs, att.id, { size: content.length }) as Observation
          att = obs.attachmentFor(att.id) as Attachment
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged.tempLocation)
          const patch = await store.saveContent(staged, att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('returns an attachment content patch if the saved content size is different', async function() {

          const content = Buffer.from('such good content')
          obs = patchAttachment(obs, att.id, { size: 1 }) as Observation
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged.tempLocation)
          const patch = await store.saveContent(staged, att.id, obs) as AttachmentContentPatchAttrs
          const contentPath = path.join(baseDirPath, contentBaseRelPath)
          const savedContent = fs.readFileSync(contentPath)

          expect(patch).to.deep.equal({ contentLocator: contentBaseRelPath, size: content.length })
          expect(savedContent.toString()).to.equal('such good content')
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          const content = Buffer.from('already located')
          obs = patchAttachment(obs, att.id, { contentLocator, size: content.length }) as Observation
          const staged = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content), staged.tempLocation)
          const saveResult = await store.saveContent(staged, att.id, obs)
          const saved = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(saveResult).to.be.null
          expect(saved.toString()).to.equal('already located')
        })

        it('TODO: returns an error if moving the staged content to the permanent path fails')
      })

      it('TODO: returns an error if creating the destination directory fails')
      it('TODO: returns an error if the observation does not have the attachment id')

      it('does not write outside the base directory if the content locator is an absolute path', async function() {

        const safeBaseDirPath = path.join(baseDirPath, 'safe1', 'safe2')
        store = await intializeAttachmentStore(safeBaseDirPath) as FileSystemAttachmentStore
        const contentLocator = path.join('/tmp', 'absolute', 'should_not_write')
        const content = Buffer.from('sinister content')
        obs = patchAttachment(obs, att.id, { contentLocator, size: content.length }) as Observation
        const result = await store.saveContent(Readable.from(content), att.id, obs)
        const okPath = path.join(safeBaseDirPath, contentLocator)

        expect(contentLocator.startsWith('/')).to.be.true
        expect(okPath).to.equal(`${safeBaseDirPath}${path.sep}tmp${path.sep}absolute${path.sep}should_not_write`)
        expect(fs.existsSync(okPath)).to.be.true
        expect(result).to.be.null
      })

      it('does not write outside the base directory if the content locator references the parent directory', async function() {

        const safeBaseDirPath = path.join(baseDirPath, 'safe1', 'safe2')
        store = await intializeAttachmentStore(safeBaseDirPath) as FileSystemAttachmentStore
        const contentLocator = path.join('..', '..', 'should_not_write')
        obs = patchAttachment(obs, att.id, { contentLocator }) as Observation
        const content = stream.Readable.from(Buffer.from('sinister content'))
        const result = await store.saveContent(content, att.id, obs)
        const dangerousPath = path.resolve(safeBaseDirPath, contentLocator)

        expect(fs.existsSync(dangerousPath)).to.be.false
        expect(result).to.be.instanceOf(AttachmentStoreError)
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

          const content120 = Buffer.from('photo thumb at 120')
          const content240 = Buffer.from('photo thumb at 240')
          const thumb120: Thumbnail = { minDimension: 120, contentLocator: uniqid(), name: 'thumb120.jpg', size: content120.length }
          const thumb240: Thumbnail = { minDimension: 240, contentLocator: uniqid(), name: 'thumb240.jpg', size: content240.length }
          obs = patchAttachment(obs, att.id, { thumbnails: [ thumb120, thumb240 ]}) as Observation
          const result120 = await store.saveThumbnailContent(Readable.from(content120), 120, att.id, obs)
          const result240 = await store.saveThumbnailContent(Readable.from(content240), 240, att.id, obs)
          const thumb120Path = path.join(baseDirPath, thumb120.contentLocator!)
          const thumb240Path = path.join(baseDirPath, thumb240.contentLocator!)
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(result120).to.be.null
          expect(saved120.toString()).to.equal('photo thumb at 120')
          expect(result240).to.be.null
          expect(saved240.toString()).to.equal('photo thumb at 240')
        })

        it('assigns a content locator and size to a thumbnail without a content locator and size', async function() {

          const attBefore = copyAttachmentAttrs(att)
          const thumb120Before = attBefore.thumbnails.find(x => x.minDimension === 120)
          const content120 = Buffer.from('thumb 120')
          const result120 = await store.saveThumbnailContent(Readable.from(content120), 120, att.id, obs) as ThumbnailContentPatchAttrs
          const pathParts = path.parse(contentBaseRelPath)
          expect(result120).to.deep.equal({
            ...thumb120Before,
            contentLocator: path.join(pathParts.dir, `${pathParts.name}-120${pathParts.ext}`),
            size: content120.length
          })
          expect(thumb120Before).to.deep.equal(copyThumbnailAttrs({ minDimension: 120 }))
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          const content120 = Buffer.from('thumb 120 located')
          obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 120, contentLocator, size: content120.length }) as Observation
          const result120 = await store.saveThumbnailContent(Readable.from(content120), 120, att.id, obs)
          const readContent120 = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(result120).to.be.null
          expect(readContent120.toString()).to.equal('thumb 120 located')
        })

        it('updates the thumbnail size if necessary', async function() {

          const contentLocator = uniqid()
          const content = Buffer.from('thumb 240 sized')
          obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 240, contentLocator, width: 240, height: 320 }) as Observation
          const result = await store.saveThumbnailContent(Readable.from(content), 240, att.id, obs) as ThumbnailContentPatchAttrs
          const readContent = fs.readFileSync(path.join(baseDirPath, contentLocator))

          expect(result).to.deep.equal(copyThumbnailAttrs({
            minDimension: 240,
            contentLocator,
            width: 240,
            height: 320,
            size: content.length,
          }))
          expect(obs.attachmentFor(att.id)?.thumbnails[1], 'should not mutate input').to.deep.equal(copyThumbnailAttrs({
            minDimension: 240,
            contentLocator,
            width: 240,
            height: 320,
          }))
          expect(readContent.toString()).to.equal('thumb 240 sized')
        })
      })

      describe('from staged content', function() {

        it('saves a thumbnail for a given size', async function() {

          const content120 = Buffer.from('photo thumb at 120')
          const content240 = Buffer.from('photo thumb at 240')
          const thumb120: Thumbnail = { minDimension: 120, contentLocator: uniqid(), name: 'thumb120.jpg', size: content120.length }
          const thumb240: Thumbnail = { minDimension: 240, contentLocator: uniqid(), name: 'thumb240.jpg', size: content240.length }
          obs = patchAttachment(obs, att.id, { thumbnails: [ thumb120, thumb240 ]}) as Observation
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content120), pending120.tempLocation)
          const pending240 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content240), pending240.tempLocation)
          const patch120 = await store.saveThumbnailContent(pending120, 120, att.id, obs)
          const patch240 = await store.saveThumbnailContent(pending240, 240, att.id, obs)
          const thumb120Path = path.join(baseDirPath, thumb120.contentLocator!)
          const thumb240Path = path.join(baseDirPath, thumb240.contentLocator!)
          const saved120 = fs.readFileSync(thumb120Path)
          const saved240 = fs.readFileSync(thumb240Path)

          expect(patch120).to.be.null
          expect(saved120.toString()).to.equal('photo thumb at 120')
          expect(patch240).to.be.null
          expect(saved240.toString()).to.equal('photo thumb at 240')
        })

        it('assigns a content locator and size to a thumbnail without a content locator and size', async function() {

          const attBefore = copyAttachmentAttrs(att)
          const thumb120Before = attBefore.thumbnails.find(x => x.minDimension === 120)
          const content120 = Buffer.from('thumb 120')
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content120), pending120.tempLocation)
          const result120 = await store.saveThumbnailContent(pending120, 120, att.id, obs) as ThumbnailContentPatchAttrs
          const pathParts = path.parse(contentBaseRelPath)

          expect(thumb120Before).to.deep.equal(copyThumbnailAttrs({ minDimension: 120 }))
          expect(result120).to.deep.equal({
            ...thumb120Before,
            size: content120.length,
            contentLocator: path.join(pathParts.dir, `${pathParts.name}-120${pathParts.ext}`)
          })
        })

        it('uses the content locator if present', async function() {

          const contentLocator = uniqid()
          const content120 = Buffer.from('thumb 120 located')
          obs = putAttachmentThumbnailForMinDimension(obs, att.id, { minDimension: 120, contentLocator, size: content120.length }) as Observation
          const pending120 = await store.stagePendingContent()
          await util.promisify(stream.pipeline)(Readable.from(content120), pending120.tempLocation)
          const result120 = await store.saveThumbnailContent(pending120, 120, att.id, obs)
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

    it('returns an error and does not throw when the base content does not exist', async function() {

      try {
        const contentRelPath = contentLocatorOfAttachment(att.id, obs)
        fs.rmSync(path.join(baseDirPath, contentRelPath))
        const err = await store.readContent(att.id, obs) as AttachmentStoreError

        expect(err).to.be.instanceOf(AttachmentStoreError)
        expect(err.errorCode).to.equal(AttachmentStoreErrorCode.StorageError)
      }
      catch (err) {
        expect.fail(`should not throw: ${String(err)}`)
      }
    })


    it('returns an error and does not throw when thumbnail content does not exist', async function() {

      try {
        const contentRelPath = contentLocatorOfThumbnail(100, att.id, obs)
        fs.rmSync(path.join(baseDirPath, contentRelPath))
        const err = await store.readThumbnailContent(100, att.id, obs) as AttachmentStoreError

        expect(err).to.be.instanceOf(AttachmentStoreError)
        expect(err.errorCode).to.equal(AttachmentStoreErrorCode.StorageError)
      }
      catch (err) {
        expect.fail(`should not throw: ${String(err)}`)
      }
    })
  })

  describe('deleting', function() {

    let savedObs: Observation
    let savedAtt: Attachment
    let savedThumb100: Thumbnail
    let savedThumb300: Thumbnail
    let attContentPath: string
    let thumb100Path: string
    let thumb300Path: string

    beforeEach(async function() {

      const attContent = Buffer.from('delete_me.main')
      const thumb100Content = Buffer.from('delete_me.x-small')
      const thumb300Content = Buffer.from('delete_me.small')
      obs = patchAttachment(obs, att.id, {
        size: attContent.length,
        thumbnails: [
          { minDimension: 100, name: 'thumb100', size: thumb100Content.length },
          { minDimension: 300, name: 'thumb300', size: thumb300Content.length }
        ]
      }) as Observation
      att = obs.attachmentFor(att.id)!
      const patch = await store.saveContent(Readable.from(attContent), att.id, obs) as AttachmentContentPatchAttrs
      savedObs = patchAttachment(obs, att.id, patch) as Observation
      const thumb1Patch = await store.saveThumbnailContent(Readable.from(thumb100Content), 100, att.id, savedObs) as ThumbnailContentPatchAttrs
      const thumb2Patch = await store.saveThumbnailContent(Readable.from(thumb300Content), 300, att.id, savedObs) as ThumbnailContentPatchAttrs
      savedObs = putAttachmentThumbnailForMinDimension(savedObs, att.id, thumb1Patch) as Observation
      savedObs = putAttachmentThumbnailForMinDimension(savedObs, att.id, thumb2Patch) as Observation
      savedAtt = savedObs.attachmentFor(att.id) as Attachment
      savedThumb100 = savedAtt.thumbnails.find(x => x.minDimension === 100) as Thumbnail
      savedThumb300 = savedAtt.thumbnails.find(x => x.minDimension === 300) as Thumbnail
      attContentPath = path.join(baseDirPath, savedAtt.contentLocator as string)
      thumb100Path = path.join(baseDirPath, savedThumb100.contentLocator as string)
      thumb300Path = path.join(baseDirPath, savedThumb300.contentLocator as string)

      expect(fs.readFileSync(attContentPath).toString()).to.equal('delete_me.main')
      expect(fs.readFileSync(thumb100Path).toString()).to.equal('delete_me.x-small')
      expect(fs.readFileSync(thumb300Path).toString()).to.equal('delete_me.small')
    })

    describe('a single attachment', function() {

      it('deletes attachment content', async function() {

        const result = await store.deleteContent(savedAtt, savedObs) as AttachmentPatchAttrs

        expect(result.contentLocator).to.be.undefined
        expect(fs.existsSync(attContentPath)).to.be.false
      })

      it('deletes thumbnail content for the attachment', async function() {

        const result = await store.deleteContent(savedAtt, savedObs) as AttachmentPatchAttrs

        expect(result.thumbnails?.length).to.equal(savedAtt.thumbnails.length)
        savedAtt.thumbnails.forEach((thumb, pos) => {
          const thumbPatch = copyThumbnailAttrs(result.thumbnails![pos])
          expect(thumbPatch.contentLocator).to.be.undefined
          expect(_.omit(copyThumbnailAttrs(thumb), 'contentLocator')).to.deep.include(_.omit(thumbPatch, 'contentLocator'))
        })
      })

      it('deletes the presumed path if the attachment does not have a content locator', async function() {

        const impliedRelPath = contentLocatorOfAttachment(att.id, savedObs)
        const impliedThumb100RelPath = contentLocatorOfThumbnail(100, att.id, savedObs)
        const impliedThumb300RelPath = contentLocatorOfThumbnail(300, att.id, savedObs)
        const impliedPath = path.join(baseDirPath, impliedRelPath)
        const impliedThumb100Path = path.join(baseDirPath, impliedThumb100RelPath)
        const impliedThumb300Path = path.join(baseDirPath, impliedThumb300RelPath)

        expect(savedAtt.contentLocator).to.equal(impliedRelPath)
        expect(savedThumb100.contentLocator).to.equal(impliedThumb100RelPath)
        expect(savedThumb300.contentLocator).to.equal(impliedThumb300RelPath)
        expect(fs.existsSync(impliedPath)).to.be.true
        expect(fs.existsSync(impliedThumb100Path)).to.be.true
        expect(fs.existsSync(impliedThumb300Path)).to.be.true
        expect(obs.attachmentFor(att.id)).to.have.property('contentLocator', undefined)
        expect(obs.attachmentFor(att.id)?.thumbnails[0]).to.have.property('contentLocator', undefined)
        expect(obs.attachmentFor(att.id)?.thumbnails[1]).to.have.property('contentLocator', undefined)

        const result = await store.deleteContent(att, obs)

        expect(result).to.be.null
        expect(fs.existsSync(impliedPath)).to.be.false
        expect(fs.existsSync(impliedThumb100Path)).to.be.false
        expect(fs.existsSync(impliedThumb300Path)).to.be.false
      })

      it('returns null when the attachment is already removed the observation', async function() {

        savedObs = removeAttachment(savedObs, att.id) as Observation
        const result = await store.deleteContent(att, savedObs) as AttachmentContentPatchAttrs

        expect(result).to.be.null
        expect(fs.existsSync(attContentPath)).to.be.false
      })
    })

    describe('all observation attachment content', function() {
      it('TODO: deletes all attachments and thumbnails across all form entries')
    })

    describe('thumbnail content', function() {
      it('TODO: may not be necessary')
    })

    it('cannot delete content outside the base directory', async function() {

      const safeBaseDirPath = path.join(baseDirPath, 'safe1', 'safe2')
      const attRelPath= path.join('..', '..', 'preserve')
      const thumb100RelPath = path.join('..', '..', 'preserve100')
      const thumb300RelPath = path.join('..', '..', 'preserve300')
      const preservePath = path.resolve(safeBaseDirPath, attRelPath)
      const preserve100Path = path.resolve(safeBaseDirPath, attRelPath + '-100')
      const preserve300Path = path.resolve(safeBaseDirPath, attRelPath + '-300')
      store = await intializeAttachmentStore(safeBaseDirPath) as FileSystemAttachmentStore
      fs.writeFileSync(preservePath, 'very valuable')
      fs.writeFileSync(preserve100Path, 'very valuable 100')
      fs.writeFileSync(preserve300Path, 'very valuable 300')
      const attackObs = patchAttachment(obs, att.id, {
        contentLocator: attRelPath,
        thumbnails: [
          { minDimension: 100, contentLocator: thumb100RelPath },
          { minDimension: 300, contentLocator: thumb300RelPath }
        ]
      }) as Observation
      const result = await store.deleteContent(att, attackObs)

      expect(result).to.be.instanceOf(AttachmentStoreError)
      expect(fs.readFileSync(preservePath).toString()).to.equal('very valuable')
      expect(fs.readFileSync(preserve100Path).toString()).to.equal('very valuable 100')
      expect(fs.readFileSync(preserve300Path).toString()).to.equal('very valuable 300')
    })
  })
})
