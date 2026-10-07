import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseSequenceRepository,
  CounterModel,
} from '../../../lib/adapters/counters/adapters.counters.db.mongoose'

describe('MongooseSequenceRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection

  before(async function() {
    this.timeout(60000)
    mongo = await MongoMemoryServer.create()
    const uri = mongo.getUri()
    conn = await mongoose.createConnection(uri).asPromise()
  })

  after(async function() {
    await conn.close()
    await mongo.stop()
  })

  let counterModel: ReturnType<typeof CounterModel>
  let repo: MongooseSequenceRepository

  beforeEach(async function() {
    counterModel = CounterModel(conn, 'test_counters')
    await counterModel.init()
    repo = new MongooseSequenceRepository(counterModel)
  })

  afterEach(async function() {
    await counterModel.deleteMany({})
  })

  describe('nextValue', function() {

    it('starts a new sequence at 1', async function() {
      const value = await repo.nextValue('layer')

      expect(value).to.equal(1)
    })

    it('increments an existing sequence', async function() {
      await repo.nextValue('layer')
      await repo.nextValue('layer')
      const value = await repo.nextValue('layer')

      expect(value).to.equal(3)
    })

    it('tracks independent sequences by name', async function() {
      await repo.nextValue('layer')
      const formValue = await repo.nextValue('form')

      expect(formValue).to.equal(1)
    })
  })

  describe('nextValues', function() {

    it('increments the sequence by the requested amount', async function() {
      const first = await repo.nextValues('layer', 5)
      const second = await repo.nextValue('layer')

      expect(first).to.deep.equal([5, 6, 7, 8, 9, 10])
      expect(second).to.equal(6)
    })
  })
})
