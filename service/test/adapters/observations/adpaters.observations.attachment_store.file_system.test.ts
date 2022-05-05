import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import util from 'util'
import { FileSystemAttachmentStore, intializeAttachmentStore, relativePathOfAttachment } from '../../../lib/adapters/observations/adpaters.observations.attachment_store.file_system'
import { Attachment, AttachmentId, Observation, ObservationAttrs } from '../../../lib/entities/observations/entities.observations'
import { MageEvent } from '../../../lib/entities/events/entities.events'
import { FormFieldType } from '../../../lib/entities/events/entities.events.forms'

const baseDirPath = path.resolve(`${__filename}.data`)
const pendingDirPath = path.resolve(baseDirPath, 'pending')

describe.only('file system attachment store', function() {

  let store: FileSystemAttachmentStore

  beforeEach(async function() {
    store = await intializeAttachmentStore(baseDirPath) as FileSystemAttachmentStore
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

    let obs: Observation
    let attachment: Attachment

    beforeEach(function() {
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
    })

    describe('from a direct stream', function() {


    })

    describe('from staged content', function() {

      it('moves the staged content to the permanent location', async function() {

        const attachment = obs.attachments[0]
        const content = stream.Readable.from(Buffer.from('such good content'))
        const pending = await store.stagePendingContent()
        await util.promisify(stream.pipeline)(content, pending.tempLocation)
        const err = await store.saveContent(pending.id, attachment.id, obs)
        const relPath = relativePathOfAttachment(attachment.id, obs) as string
        const absPath = path.resolve(baseDirPath, relPath)
        const stats = await util.promisify(fs.stat)(absPath)
        const savedContent = await util.promisify(fs.readFile)(absPath)

        expect(err).to.be.null
        expect(stats.isFile()).to.be.true
        expect(savedContent.toString()).to.equal('such good content')
      })

      it('returns an error if the creating the destination directory fails')
      it('returns an error if moving the staged content to the permanent path fails')
    })

    it('returns an error if the observation does not have the attachment id')
  })
})