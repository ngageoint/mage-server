import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoosePluginStateRepository, PluginStateDocument } from '../../../lib/adapters/plugins/adapters.plugins.db.mongoose'
import Mongoose from 'mongoose'
import uniqid from 'uniqid'
import _ from 'lodash'

interface TestState {
  foo: string
  bar: number
  loo: { gar: number }[]
  noo?: {
    zar: boolean,
    goo: string
  }
}

describe('mongoose plugin state repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let mongoose: Mongoose.Mongoose
  let conn: Mongoose.Connection
  let repo: MongoosePluginStateRepository<TestState>
  let pluginId: string

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    mongoose = new Mongoose.Mongoose()
    conn = await mongoose.connect(uri, {
      useMongoClient: true,
      promiseLibrary: Promise
    })
    pluginId = uniqid('@test/')
    repo = new MongoosePluginStateRepository(pluginId, mongoose)
  })

  afterEach(async function() {
    await repo.model.remove({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  it('creates a model for the plugin id', async function() {

    const name = `plugin_state_${pluginId}`

    expect(mongoose.modelNames()).to.deep.equal([ name ])

    const model = mongoose.model(name)

    expect(model).to.equal(repo.model)
    expect(model.collection.name).to.equal(name)

    const repo2 = new MongoosePluginStateRepository(pluginId, mongoose)

    expect(repo2.model).to.equal(repo.model)
  })

  describe('saving the first state', function() {

    it('puts the first state', async function() {

      const state: TestState = {
        foo: uniqid(),
        bar: 92,
        loo: []
      }
      const saved = await repo.put(state)
      const found = await repo.model.findById(pluginId)

      expect(saved).to.deep.equal(state)
      expect(found).to.deep.include({
        _id: pluginId,
        state
      })
    })

    it('patches the first state', async function() {

      const state: TestState = {
        foo: uniqid(),
        bar: 92,
        loo: []
      }
      const saved = await repo.put(state)
      const found = await repo.model.findById(pluginId)

      expect(saved).to.deep.equal(state)
      expect(found).to.deep.include({
        _id: pluginId,
        state
      })
    })
  })

  describe('getting the state', function() {

    it('gets null before the first save', async function() {

      const state = await repo.get()
      expect(state).to.be.null
    })

    it('gets the saved state', async function() {

      const state: TestState = {
        foo: uniqid(),
        bar: 22,
        loo: [ { gar: 1 }, { gar: 2 } ],
        noo: { zar: false, goo: '' }
      }
      const saved = await repo.put(state)
      const got = await repo.get()

      expect(got).to.deep.equal(saved)
    })
  })

  describe('patching the state', function() {

    it('patches shallow keys', async function() {

      const orig: TestState = {
        foo: uniqid(),
        bar: 52,
        loo: [],
        noo: {
          goo: uniqid(),
          zar: false
        }
      }
      const saved = await repo.put(orig)
      const patch: Partial<TestState> = {
        foo: uniqid(),
        bar: 104
      }
      const patched = await repo.patch(patch)

      expect(saved).to.deep.equal(orig)
      expect(patched).to.deep.equal({
        ...orig,
        ...patch
      })
    })

    it('unsets undefined keys', async function() {

      const orig: TestState = {
        foo: uniqid(),
        bar: 52,
        loo: [],
        noo: {
          goo: uniqid(),
          zar: false
        }
      }
      const saved = await repo.put(orig)
      const patch: Partial<TestState> = {
        foo: undefined,
        bar: undefined
      }
      const patched = await repo.patch(patch)

      expect(saved).to.deep.equal(orig)
      expect(patched).to.deep.equal(_.omit(orig, 'foo', 'bar'))
    })
  })
})