import { URL } from 'url'
import { expect } from 'chai'
import _, { uniq, uniqueId } from 'lodash'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import uniqid from 'uniqid'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { StaticIcon, StaticIconContentStore, StaticIconImportFetch, StaticIconStub } from '../../../lib/entities/icons/entities.icons'
import { MongooseStaticIconRepository, StaticIconDocument, StaticIconModel } from '../../../lib/adapters/icons/adapters.icons.db.mongoose'
import { EntityIdFactory, UrlResolutionError, UrlScheme } from '../../../lib/entities/entities.global'
import { Readable } from 'stream'

interface TestUrlScheme extends UrlScheme {
  urlWithPath(path: string): URL
}

function MockTestUrlScheme(protocolPrefix: string, isLocal = false): SubstituteOf<TestUrlScheme> {
  const scheme = Sub.for<TestUrlScheme>()
  scheme.urlWithPath(Arg.any()).mimicks(path => new URL(`${protocolPrefix}///${path}`))
  scheme.canResolve(Arg.all()).mimicks(url => url.protocol === protocolPrefix)
  ;(scheme.isLocalScheme as any).returns(isLocal)
  return scheme
}

describe('static icon mongoose repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection
  let model: mongoose.Model<StaticIconDocument>
  let idFactory: SubstituteOf<EntityIdFactory>
  let repo: MongooseStaticIconRepository
  let scheme1: SubstituteOf<TestUrlScheme>
  let scheme2Local: SubstituteOf<TestUrlScheme>
  let scheme3: SubstituteOf<TestUrlScheme>
  let resolvers: SubstituteOf<TestUrlScheme>[]
  let contentStore: SubstituteOf<StaticIconContentStore>

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri, {
      useMongoClient: true,
      promiseLibrary: Promise
    })
    model = StaticIconModel(conn, 'test_static_icons')
    idFactory = Sub.for<EntityIdFactory>()
    contentStore = Sub.for<StaticIconContentStore>()
    scheme1 = MockTestUrlScheme('test1:')
    scheme2Local = MockTestUrlScheme('test2:', true)
    scheme3 = MockTestUrlScheme('test3:')
    resolvers = [ scheme1, scheme2Local, scheme3 ]
    repo = new MongooseStaticIconRepository(model, idFactory, contentStore, resolvers)
    model.findOne({})
  })

  afterEach(async function() {
    await model.remove({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  describe('importing by source url', function() {

    it('registers a new static icon', async function() {

      const sourceUrl = new URL('mage:///test/icons/new.png')
      const stub: Required<StaticIconStub> = {
        sourceUrl,
        imageType: 'raster',
        sizeBytes: 100,
        sizePixels: { width: 200, height: 200 },
        contentHash: uniqid(),
        contentTimestamp: Date.now(),
        mediaType: 'image/png',
        tags: [ 'test' ],
        fileName: 'new.png',
        title: 'Test Icon',
        summary: 'unregistered'
      }
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const registered = await repo.findOrImportBySourceUrl(stub)
      const found = await model.find({})

      expect(found).to.have.length(1)
      const foundJson = found[0].toJSON()
      expect(_.omit(foundJson, 'registeredTimestamp')).to.deep.equal({ id, ...stub })
      expect(foundJson.registeredTimestamp).to.be.closeTo(Date.now(), 100)
      expect(registered).to.deep.equal(found[0].toJSON())
    })

    it('registers a new source url', async function() {

      const sourceUrl = new URL('mage:///test/icons/bare.png')
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const reg = await repo.findOrImportBySourceUrl(sourceUrl)
      const allDocs = await model.find({})
      expect(allDocs).to.have.length(1)
      const regDoc = allDocs[0]
      const registered = regDoc.registeredTimestamp
      expect(registered).to.be.closeTo(Date.now(), 100)
      expect(reg).to.deep.equal({
        id,
        sourceUrl,
        registeredTimestamp: registered,
        tags: []
      })
      idFactory.received(1).nextId()
    })

    it('sets the content timestamp when content hash is present', async function() {

      const sourceUrl = new URL('mage:///test/timestamp.png')
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const attrs: StaticIconStub = {
        sourceUrl,
        contentHash: uniqid()
      }
      const reg = await repo.findOrImportBySourceUrl(attrs) as StaticIcon

      expect(reg.contentTimestamp).to.be.closeTo(Date.now(), 100)
    })

    it('replaces icon properties for an existing source url when the content hash changes', async function() {

      const sourceUrl = new URL('mage:///test/replace.png')
      const origAttrs: Required<StaticIconStub> = {
        sourceUrl,
        imageType: 'raster',
        sizeBytes: 1000,
        sizePixels: { width: 120, height: 120 },
        contentHash: uniqid(),
        contentTimestamp: Date.now() - 10000,
        mediaType: 'image/png',
        tags: [],
        fileName: 'orig.png',
        title: 'Original',
        summary: 'replace me'
      }
      const updatedAttrs: Required<StaticIconStub> = {
        sourceUrl,
        imageType: 'vector',
        sizeBytes: 1100,
        sizePixels: { width: 220, height: 220 },
        contentHash: uniqid(),
        contentTimestamp: Date.now(),
        mediaType: 'svg',
        tags: [ 'test' ],
        fileName: 'updated.png',
        title: 'Updated',
        summary: 'replaced'
      }
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const orig = await repo.findOrImportBySourceUrl(origAttrs)
      const origFound = await model.find({})

      expect(orig).to.deep.include({ id, ...origAttrs })

      const updated = await repo.findOrImportBySourceUrl(updatedAttrs)
      const updatedFound = await model.find({})

      expect(updated).to.deep.include({ id, ...updatedAttrs })
      expect(origFound).to.have.length(1)
      expect(updatedFound).to.have.length(1)
      expect(origFound[0].toJSON()).to.deep.equal({ id, registeredTimestamp: origFound[0].registeredTimestamp, ...origAttrs })
      expect(updatedFound[0].toJSON()).to.deep.equal({ id, registeredTimestamp: updatedFound[0].registeredTimestamp, ...updatedAttrs })
      idFactory.received(1).nextId()
    })

    it('removes properties not defined in updated icon when the content hash changes', async function() {

      const sourceUrl = new URL('mage:///test/replace.png')
      const origAttrs: Required<StaticIconStub> = Object.freeze({
        sourceUrl,
        imageType: 'raster',
        sizeBytes: 1000,
        sizePixels: { width: 120, height: 120 },
        contentHash: uniqid(),
        contentTimestamp: Date.now() - 10000,
        mediaType: 'image/png',
        tags: [],
        fileName: 'orig.png',
        title: 'Original',
        summary: 'replace me'
      })
      const updatedAttrs: StaticIconStub = Object.freeze({
        sourceUrl,
        imageType: 'vector',
        sizeBytes: 1100,
        sizePixels: { width: 220, height: 220 },
        contentHash: uniqid(),
        mediaType: 'svg',
        tags: [ 'test' ],
      })
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const orig = await repo.findOrImportBySourceUrl(origAttrs)
      const origFound = await model.find({})
      const updated = await repo.findOrImportBySourceUrl(updatedAttrs)
      const updatedFound = await model.find({})

      expect(origFound).to.have.length(1)
      expect(updatedFound).to.have.length(1)
      const registeredTimestamp = origFound[0].registeredTimestamp
      expect(registeredTimestamp).to.be.closeTo(Date.now(), 150)
      expect(updatedFound[0].contentTimestamp).to.be.closeTo(Date.now(), 150)
      expect(_.omit(origFound[0].toJSON(), 'registeredTimestamp')).to.deep.equal({ id, ...origAttrs })
      expect(_.omit(updatedFound[0].toJSON(), 'contentTimestamp')).to.deep.equal({ id, registeredTimestamp, ...updatedAttrs })
      expect(orig).to.deep.equal({ id, registeredTimestamp, ...origAttrs })
      expect(updated).to.deep.equal({ id, registeredTimestamp, contentTimestamp: updatedFound[0].contentTimestamp, ...updatedAttrs })
      idFactory.received(1).nextId()
    })

    it('adds properties not defined in existing icon', async function() {

      const sourceUrl = new URL('mage:///test/replace.png')
      const origAttrs: StaticIconStub = {
        sourceUrl,
        imageType: 'raster',
        sizeBytes: 1000,
        sizePixels: { width: 120, height: 120 },
        contentHash: uniqid(),
        mediaType: 'image/png',
        tags: [],
      }
      const updatedAttrs: StaticIconStub = {
        sourceUrl,
        imageType: 'vector',
        sizeBytes: 1100,
        sizePixels: { width: 220, height: 220 },
        contentHash: uniqid(),
        mediaType: 'svg',
        tags: [ 'test' ],
        fileName: 'updated.png',
        title: 'Updated',
        summary: 'replaced'
      }
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const orig = await repo.findOrImportBySourceUrl(origAttrs)
      const origFound = await model.find({})
      const updated = await repo.findOrImportBySourceUrl(updatedAttrs)
      const updatedFound = await model.find({})

      expect(origFound).to.have.length(1)
      expect(updatedFound).to.have.length(1)
      const registeredTimestamp = origFound[0].registeredTimestamp
      expect(_.omit(orig, 'contentTimestamp')).to.deep.equal({ id, registeredTimestamp, ...origAttrs })
      expect(_.omit(updated, 'contentTimestamp')).to.deep.equal({ id, registeredTimestamp, ...updatedAttrs })
      expect(_.omit(origFound[0].toJSON())).to.deep.equal({ id, registeredTimestamp, contentTimestamp: origFound[0].contentTimestamp, ...origAttrs })
      expect(_.omit(updatedFound[0].toJSON())).to.deep.equal({ id, registeredTimestamp, contentTimestamp: updatedFound[0].contentTimestamp, ...updatedAttrs })
      idFactory.received(1).nextId()
    })

    it('does not update the icon properties when the content hash did not change', async function() {

      const sourceUrl = new URL('test:///icons/nochange.png')
      const stub: StaticIconStub = {
        sourceUrl,
        contentHash: 'nochange',
        imageType: 'raster',
        mediaType: 'image/png',
        sizeBytes: 1024,
        sizePixels: { width: 100, height: 100 },
        tags: []
      }
      const sameHashStub: StaticIconStub = {
        sourceUrl,
        contentHash: stub.contentHash,
        imageType: 'vector',
        mediaType: 'image/svg+xml',
        sizeBytes: 2048,
        sizePixels: { width: 0, height: 0 },
        tags: [ 'same' ],
        title: 'No Change',
        summary: 'Should not update',
        fileName: 'nochange.png'
      }
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const registered = await repo.findOrImportBySourceUrl(stub) as StaticIcon

      expect(registered).to.deep.include({ id,  ...stub })
      expect(registered.contentTimestamp).to.be.closeTo(Date.now(), 100)

      const sameHashRegistered = await repo.findOrImportBySourceUrl(sameHashStub)

      expect(sameHashRegistered).to.deep.equal(registered)
    })

    it('does not update the icon properties if the stub has no content hash', async function() {

      const sourceUrl = new URL('mage:///test/replace.png')
      const origAttrs: Required<StaticIconStub> = Object.freeze({
        sourceUrl,
        imageType: 'raster',
        sizeBytes: 1000,
        sizePixels: { width: 120, height: 120 },
        contentHash: uniqid(),
        contentTimestamp: Date.now() - 10000,
        mediaType: 'image/png',
        tags: [],
        fileName: 'orig.png',
        title: 'Original',
        summary: 'replace me'
      })
      const updatedAttrs: StaticIconStub = Object.freeze({
        contentHash: undefined,
        sourceUrl,
        imageType: 'vector',
        sizeBytes: 1100,
        sizePixels: { width: 220, height: 220 },
        contentTimestamp: Date.now(),
        mediaType: 'svg',
        tags: [ 'test' ],
        fileName: 'updated.png',
        title: 'Updated',
        summary: 'replaced'
      })
      const id = uniqid()
      idFactory.nextId().resolves(id)
      const orig = await repo.findOrImportBySourceUrl(origAttrs)
      const origFound = await model.find({})
      const updated = await repo.findOrImportBySourceUrl(updatedAttrs)
      const updatedFound = await model.find({})

      expect(orig).to.deep.equal({ id, registeredTimestamp: origFound[0].registeredTimestamp, ...origAttrs })
      expect(updated).to.deep.equal(orig)
      expect(origFound).to.have.length(1)
      expect(updatedFound).to.have.length(1)
      expect(origFound[0].toJSON()).to.deep.equal({ id, registeredTimestamp: origFound[0].registeredTimestamp, ...origAttrs })
      expect(updatedFound[0].toJSON()).to.deep.equal(origFound[0].toJSON())
      idFactory.received(1).nextId()
    })

    describe('import fetch strategies', function() {

      describe(StaticIconImportFetch.Lazy, function () {

        it('does not fetch and store the icon content', async function() {

          const sourceUrl = scheme1.urlWithPath('lazy.png')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          const icon = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Lazy) as StaticIcon

          expect(icon.id).to.equal(iconId)
          contentStore.didNotReceive().putContent(Arg.all())
        })

        it('is the default strategy', async function() {

          const sourceUrl = scheme1.urlWithPath('lazy.png')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          const icon = await repo.findOrImportBySourceUrl(sourceUrl) as StaticIcon

          expect(icon.id).to.equal(iconId)
          contentStore.didNotReceive().putContent(Arg.all())
        })
      })

      describe(StaticIconImportFetch.Eager, function() {

        it('fetches the icon immediately asynchronously', async function() {

          const sourceUrl = scheme3.urlWithPath('icons/eager')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          let fetchResolved = false
          let resolveFetch = () => {}
          const content = Readable.from('')
          const fetch = function(resolve: (x: NodeJS.ReadableStream) => any): any {
            resolveFetch = () => {
              fetchResolved = true
              resolve(content)
            }
          }
          const fetchPromise = new Promise(fetch)
          scheme3.resolveContent(Arg.sameStringValueAs(sourceUrl)).returns(fetchPromise)
          contentStore.putContent(Arg.all()).resolves()
          const icon = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Eager) as StaticIcon
          const iconDoc = await model.findById(iconId)

          expect(icon).to.deep.include({ id: iconId, sourceUrl })
          expect(icon.resolvedTimestamp).to.be.undefined
          expect(repo.entityForDocument(iconDoc!)).to.deep.equal(icon)
          expect(fetchResolved).to.be.false
          scheme3.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          contentStore.didNotReceive().putContent(Arg.all())

          resolveFetch()
          await fetchPromise

          contentStore.received(1).putContent(Arg.deepEquals(icon), content)
          expect(fetchResolved).to.equal(true)

          const updatedDoc = await new Promise<StaticIconDocument>((resolve) => {
            setTimeout(function check() {
              model.findById(iconId).then(x => {
                if (typeof x?.resolvedTimestamp === 'number') {
                  return resolve(x)
                }
                setTimeout(check)
              })
            })
          })

          expect(repo.entityForDocument(updatedDoc!)).to.deep.include(icon)
          expect(updatedDoc?.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          scheme3.received(1).resolveContent(Arg.all())
        })

        it('fetches if the icon was already registered and not fetched', async function() {

          const sourceUrl = scheme1.urlWithPath('eager/registered')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          const lazy = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Lazy) as StaticIcon
          const lazyDoc = await model.findById(iconId)

          expect(lazy).to.deep.include({ id: iconId, sourceUrl })
          expect(lazy.resolvedTimestamp).to.be.undefined
          expect(repo.entityForDocument(lazyDoc!)).to.deep.equal(lazy)

          let resolveFetch = () => {}
          const content = Readable.from('')
          const fetchPromise = new Promise(function(resolve: (x: NodeJS.ReadableStream) => any): any {
            resolveFetch = () => {
              resolve(content)
            }
          })
          scheme1.resolveContent(Arg.sameStringValueAs(sourceUrl)).returns(fetchPromise)
          contentStore.putContent(Arg.all()).resolves()
          const eager = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Eager)
          const eagerDoc = await model.findById(iconId)

          expect(eager).to.deep.equal(lazy)
          expect(repo.entityForDocument(eagerDoc!)).to.deep.equal(eager)
          scheme1.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          contentStore.didNotReceive().putContent(Arg.all())

          resolveFetch()
          await fetchPromise

          contentStore.received(1).putContent(Arg.deepEquals(lazy) as StaticIcon, content)

          const updatedDoc = await new Promise<StaticIconDocument>((resolve) => {
            setTimeout(function check() {
              model.findById(iconId).then(x => {
                if (typeof x?.resolvedTimestamp === 'number') {
                  return resolve(x)
                }
                setTimeout(check)
              })
            })
          })

          expect(updatedDoc.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          expect(repo.entityForDocument(updatedDoc!)).to.deep.include(lazy)
          scheme1.received(1).resolveContent(Arg.all())
        })

        it('does not fetch if the icon was already resolved', async function() {

          const sourceUrl = scheme1.urlWithPath('resolved/before.png')
          const iconId = uniqid()
          const iconDoc = await model.create({
            _id: iconId,
            sourceUrl: String(sourceUrl),
            registeredTimestamp: Date.now(),
            resolvedTimestamp: Date.now() - 1000
          })
          scheme1.resolveContent(Arg.all()).resolves(new UrlResolutionError(sourceUrl, 'unexpected fetch'))
          contentStore.putContent(Arg.all()).resolves()
          const found = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Eager)
          const sameDoc = await model.findById(iconId)

          expect(found).to.deep.equal(repo.entityForDocument(iconDoc))
          expect(repo.entityForDocument(sameDoc!)).to.deep.equal(repo.entityForDocument(iconDoc))
          expect(sameDoc?.__v).to.equal(iconDoc.__v)
          scheme1.didNotReceive().resolveContent(Arg.all())
          contentStore.didNotReceive().putContent(Arg.all())
        })

        it('fetches but does not store if the source url scheme is local', async function() {

          const sourceUrl = scheme2Local.urlWithPath('stored/already.png')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          scheme2Local.resolveContent(Arg.any()).resolves(Readable.from(''))
          contentStore.putContent(Arg.all()).resolves()
          const icon = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Eager) as StaticIcon
          const iconDoc = await model.findById(iconId)
          const resolvedDoc = await new Promise<StaticIconDocument>((resolve) => {
            setTimeout(function check() {
              model.findById(iconId).then(x => {
                if (typeof x?.resolvedTimestamp === 'number') {
                  return resolve(x)
                }
                setTimeout(check)
              })
            })
          })

          expect(icon).to.deep.include({ id: iconId, sourceUrl })
          expect(icon.resolvedTimestamp).to.be.undefined
          expect(_.omit(repo.entityForDocument(iconDoc!), 'resolvedTimestamp')).to.deep.equal(_.omit(icon, 'resolvedTimestamp'))
          expect(resolvedDoc.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          expect(repo.entityForDocument(resolvedDoc)).to.deep.include(icon)
          scheme2Local.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          scheme2Local.received(1).resolveContent(Arg.all())
          contentStore.didNotReceive().putContent(Arg.all())
        })
      })

      describe(StaticIconImportFetch.EagerAwait, function() {

        it('fetches, stores, and updates the icon in one promise', async function() {

          const sourceUrl = scheme3.urlWithPath('icons/eager-await')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          const content = Readable.from('')
          scheme3.resolveContent(Arg.sameStringValueAs(sourceUrl)).resolves(content)
          contentStore.putContent(Arg.all()).resolves()
          const icon = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.EagerAwait) as StaticIcon
          const iconDoc = await model.findById(iconId)

          expect(icon).to.deep.include({ id: iconId, sourceUrl })
          expect(icon.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          expect(repo.entityForDocument(iconDoc!)).to.deep.equal(icon)
          scheme3.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          scheme3.received(1).resolveContent(Arg.all())
          contentStore.received(1).putContent(Arg.deepEquals(_.omit(icon, 'resolvedTimestamp')), content)
          contentStore.received(1).putContent(Arg.all())
        })

        it('fetches if the icon was already registered and not fetched', async function() {

          const sourceUrl = scheme1.urlWithPath('eager-await/registered')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          const lazy = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.Lazy) as StaticIcon
          const lazyDoc = await model.findById(iconId)

          expect(lazy).to.deep.include({ id: iconId, sourceUrl })
          expect(lazy.resolvedTimestamp).to.be.undefined
          expect(repo.entityForDocument(lazyDoc!)).to.deep.equal(lazy)

          const content = Readable.from('')
          scheme1.resolveContent(Arg.sameStringValueAs(sourceUrl)).resolves(content)
          contentStore.putContent(Arg.all()).resolves()
          const eager = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.EagerAwait) as StaticIcon
          const eagerDoc = await model.findById(iconId)

          expect(eager).to.deep.include(lazy)
          expect(eager.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          expect(repo.entityForDocument(eagerDoc!)).to.deep.equal(eager)
          scheme1.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          scheme1.received(1).resolveContent(Arg.all())
          contentStore.received(1).putContent(Arg.deepEquals(lazy) as StaticIcon, content)
          contentStore.received(1).putContent(Arg.all())
        })

        it('does not fetch if the icon was already resolved', async function() {

          const sourceUrl = scheme1.urlWithPath('resolved/before.png')
          const iconId = uniqid()
          const iconDoc = await model.create({
            _id: iconId,
            sourceUrl: String(sourceUrl),
            registeredTimestamp: Date.now(),
            resolvedTimestamp: Date.now() - 1000
          })
          scheme1.resolveContent(Arg.all()).resolves(new UrlResolutionError(sourceUrl, 'unexpected fetch'))
          contentStore.putContent(Arg.all()).resolves()
          const found = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.EagerAwait)
          const sameDoc = await model.findById(iconId)

          expect(found).to.deep.equal(repo.entityForDocument(iconDoc))
          expect(repo.entityForDocument(sameDoc!)).to.deep.equal(repo.entityForDocument(iconDoc))
          expect(sameDoc?.__v).to.equal(iconDoc.__v)
          scheme1.didNotReceive().resolveContent(Arg.all())
          contentStore.didNotReceive().putContent(Arg.all())
        })

        it('fetches but does not store if the source url scheme is local', async function() {

          const sourceUrl = scheme2Local.urlWithPath('stored/already.png')
          const iconId = uniqid()
          idFactory.nextId().resolves(iconId)
          scheme2Local.resolveContent(Arg.sameStringValueAs(sourceUrl)).resolves(Readable.from(''))
          contentStore.putContent(Arg.all()).resolves()
          const icon = await repo.findOrImportBySourceUrl(sourceUrl, StaticIconImportFetch.EagerAwait) as StaticIcon
          const iconDoc = await model.findById(iconId)

          expect(icon).to.deep.include({ id: iconId, sourceUrl })
          expect(icon.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
          expect(repo.entityForDocument(iconDoc!)).to.deep.equal(icon)
          scheme2Local.received(1).resolveContent(Arg.sameStringValueAs(sourceUrl))
          scheme2Local.received(1).resolveContent(Arg.all())
          contentStore.didNotReceive().putContent(Arg.all())
        })
      })
    })
  })

  it('enforces unique source url', async function() {

    const sourceUrl = new URL('must:///be/unique')
    const attrs: Required<StaticIconStub> & { sourceUrl: URL } = Object.freeze({
      sourceUrl,
      contentHash: '1',
      contentTimestamp: Date.now(),
      fileName: 'unique.png',
      imageType: 'raster',
      mediaType: 'image/png',
      sizeBytes: 1000,
      sizePixels: { width: 120, height: 100 },
      summary: 'there can be only one',
      tags: [ 'test' ],
      title: 'no dups'
    })
    const nextId = uniqid()
    idFactory.nextId().resolves(nextId)
    const created = await repo.create(attrs)

    expect(created).to.deep.include({ id: nextId, ...attrs })
    await expect(repo.create(attrs)).to.eventually.be.rejected

    const all = await model.find({})

    expect(all).to.have.length(1)
  })

  describe('finding icons', function() {

    it('supports paging', async function() {

      const icons: StaticIconStub[] = []
      let remaining = 100
      while (remaining--) {
        const countPadded = String(100 - remaining).padStart(3, '0')
        icons.push({
          sourceUrl: new URL(`test://${countPadded}`)
        })
      }
      const docs = await model.insertMany(icons.map(x => ({ ...x, _id: uniqid(), registeredTimestamp: Date.now()})))

      expect(docs.length).to.equal(100)

      const page = await repo.find({ pageSize: 23, pageIndex: 2, includeTotalCount: true })

      expect(page.totalCount).to.equal(100)
      expect(page.items.length).to.equal(23)
      expect(page.items.map(x => ({ sourceUrl: x.sourceUrl }))).to.deep.equal(icons.slice(46, 69))
    })
  })

  describe('loading icon content', function() {

    let scheme1Icon: StaticIcon
    let scheme1IconUnresolved: StaticIcon
    let scheme2LocalIcon: StaticIcon

    beforeEach(async function() {

      scheme1Icon = {
        id: uniqid(),
        sourceUrl: scheme1.urlWithPath('test1.png'),
        registeredTimestamp: Date.now(),
        resolvedTimestamp: Date.now(),
        tags: []
      }
      scheme1IconUnresolved = {
        id: uniqid(),
        sourceUrl: scheme1.urlWithPath('test1-unresolved.png'),
        registeredTimestamp: Date.now(),
        tags: []
      }
      scheme2LocalIcon = {
        id: uniqueId(),
        sourceUrl: scheme2Local.urlWithPath('test2.png'),
        registeredTimestamp: Date.now(),
        resolvedTimestamp: Date.now(),
        tags: []
      }
      await model.insertMany([
        { ...scheme1Icon, _id: scheme1Icon.id },
        { ...scheme2LocalIcon, _id: scheme2LocalIcon.id },
        { ...scheme1IconUnresolved, _id: scheme1IconUnresolved.id }
      ])
    })

    it('returns null if the icon does not exist', async function() {

      const content = await repo.loadContent('shrug')

      expect(content).to.be.null
      contentStore.didNotReceive().loadContent(Arg.all())
      for (const scheme of [ scheme1, scheme2Local, scheme3 ]) {
        scheme.didNotReceive().resolveContent(Arg.all())
      }
    })

    it('returns error if there is no resolver for the icon url', async function() {

      const icon: StaticIcon = {
        id: uniqid(),
        sourceUrl: new URL(`test-${uniqid()}:///what/is/this?`),
        registeredTimestamp: Date.now()
      }
      await model.create({ ...icon, _id: icon.id })
      const content = await repo.loadContent(icon.id) as UrlResolutionError

      expect(content).to.be.instanceOf(UrlResolutionError)
      expect(String(content.sourceUrl)).to.equal(String(icon.sourceUrl))
      expect(content.message).to.contain(`no scheme found to resolve source url ${icon.sourceUrl} of icon ${icon.id}`)
      for (const scheme of resolvers) {
        scheme.didNotReceive().resolveContent(Arg.all())
      }
      contentStore.didNotReceive().loadContent(Arg.all())
    })

    it('throws error if the icon url is invalid', async function() {

      const iconId = uniqid()
      await model.create({ _id: iconId, sourceUrl: 'shall not pass', registeredTimestamp: Date.now() })
      try {
        await repo.loadContent(iconId) as UrlResolutionError
      }
      catch (err: any) {
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.contain('Invalid URL')
        return
      }
      expect.fail('expected error to be thrown')
    })

    it('loads content from url if the source url scheme is local', async function() {

      const content = Readable.from('an image')
      scheme2Local.resolveContent(Arg.sameStringValueAs(scheme2LocalIcon.sourceUrl)).resolves(content)
      const loaded = await repo.loadContent(scheme2LocalIcon.id)

      expect(loaded).to.deep.equal([ scheme2LocalIcon, content ])
      scheme2Local.received(1).resolveContent(Arg.sameStringValueAs(scheme2LocalIcon.sourceUrl))
      contentStore.didNotReceive().loadContent(Arg.all())
    })

    it('loads content from the store if the source url is not local', async function() {

      const content = Readable.from('')
      contentStore.loadContent(scheme1Icon.id).resolves(content)
      const loaded = await repo.loadContent(scheme1Icon.id)

      expect(loaded).to.deep.equal([ scheme1Icon, content ])
      contentStore.received(1).loadContent(scheme1Icon.id)
      scheme1.didNotReceive().resolveContent(Arg.all())
    })

    it('imports the content if the url is registered but not yet resolved', async function() {

      const fetchedContent = Readable.from('')
      const storedContent = Readable.from('')
      scheme1.resolveContent(Arg.sameStringValueAs(scheme1IconUnresolved.sourceUrl)).resolves(fetchedContent)
      contentStore.putContent(Arg.is(x => x.id === scheme1IconUnresolved.id), fetchedContent).resolves()
      contentStore.loadContent(scheme1IconUnresolved.id).resolves(storedContent)
      const loaded = await repo.loadContent(scheme1IconUnresolved.id)
      const resolvedIcon = await repo.findById(scheme1IconUnresolved.id)

      expect(resolvedIcon?.resolvedTimestamp).to.be.closeTo(Date.now(), 100)
      expect(loaded).to.deep.equal([ resolvedIcon, storedContent ])
      scheme1.received(1).resolveContent(Arg.sameStringValueAs(scheme1IconUnresolved.sourceUrl))
      contentStore.received(1).putContent(Arg.deepEquals(scheme1IconUnresolved), fetchedContent)
    })
  })
})