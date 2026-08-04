import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import stream, { Readable } from 'stream'
import util from 'util'
import uniqid from 'uniqid'
import _ from 'lodash'
import { StaticIcon, StaticIconContentStore, StaticIconStoreError, StaticIconStoreErrorCode } from '../../../lib/entities/icons/entities.icons'
import { FileSystemIconContentStore } from '../../../lib/adapters/icons/adapters.icons.content_store.file_system'
import { BufferWriteable } from '../../utils'

const baseDirPath = path.resolve(`${__filename}.data`)

describe('file system static icon content store', function() {

  let store: StaticIconContentStore

  function contentLocatorOfIcon(icon: StaticIcon): string {
    const registered = new Date(icon.registeredTimestamp)
    return path.join(
      String(registered.getUTCFullYear()),
      String(registered.getUTCMonth() + 1).padStart(2, '0'),
      icon.id
    )
  }

  beforeEach(async function() {
    store = new FileSystemIconContentStore(baseDirPath)
  })

  afterEach(async function() {
    const rm = util.promisify(fs.rm)
    await rm(baseDirPath, { force: true, recursive: true })
  })

  describe('saving content', function() {

    let contentBaseRelPath: string

    beforeEach(function() {

    })

    describe('for static icon', function() {
      it('saves the content to the permanent location', async function() {
        const staticIcon: StaticIcon = {
          id: uniqid(),
          registeredTimestamp: Date.now()
        }

        const content = Buffer.from('such good content')
        await store.putContent(staticIcon, Readable.from(content))
        const contentBaseRelPath = contentLocatorOfIcon(staticIcon)
        const absPath = path.resolve(baseDirPath, contentBaseRelPath)
        const stats = fs.statSync(absPath)
        const savedContent = fs.readFileSync(absPath)

        expect(stats.isFile()).to.be.true
        expect(savedContent.toString()).to.equal('such good content')
      })
    })
  })

  describe('reading', function() {
    const content = '1234567890'
    let staticIcon: StaticIcon

    beforeEach(async function() {
      staticIcon = {
        id: uniqid(),
        registeredTimestamp: Date.now()
      }
      await store.putContent(staticIcon, stream.Readable.from(Buffer.from(content)))
    })

    it('provides a read stream of the content', async function() {
      const contentStream = await store.loadContent(staticIcon) as NodeJS.ReadableStream
      const readContent = new BufferWriteable()
      await util.promisify(stream.pipeline)(contentStream, readContent)

      expect(readContent.bytes.toString()).to.equal(content)
    })


    it('returns an error and does not throw when the icon content does not exist', async function() {

      try {
        const contentBaseRelPath = contentLocatorOfIcon(staticIcon)
        fs.rmSync(path.join(baseDirPath, contentBaseRelPath))
        const err = await store.loadContent(staticIcon) as StaticIconStoreError
        expect(err).to.be.instanceOf(StaticIconStoreError)
        expect(err.errorCode).to.equal(StaticIconStoreErrorCode.ContentNotFound)
      } catch(err) {
        expect.fail(`should not throw: ${String(err)}`)
      }

    })
  })
})
