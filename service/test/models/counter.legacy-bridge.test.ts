import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongooseSequenceRepository, CounterModel } from '../../lib/adapters/counters/adapters.counters.db.mongoose'

describe('counter model legacy bridge', function() {

  let counterModule: any
  let counterModel: ReturnType<typeof CounterModel>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    counterModule = require('../../lib/models/counter')
    counterModel = CounterModel(mongoose.connection, 'test_counter_legacy_bridge')
    counterModule.initialize({ sequenceRepo: new MongooseSequenceRepository(counterModel) })
  })

  afterEach(async function() {
    await counterModel.deleteMany({})
  })

  it('getNext returns an incrementing value, starting at 1', async function() {
    const first = await counterModule.getNext('bridge-layer')
    const second = await counterModule.getNext('bridge-layer')

    expect(first).to.equal(1)
    expect(second).to.equal(2)
  })

  it('getNext tracks independent sequences by collection name', async function() {
    await counterModule.getNext('bridge-layer')
    const formValue = await counterModule.getNext('bridge-form')

    expect(formValue).to.equal(1)
  })

  it('getGroup delegates to the repository', async function() {
    const group = await counterModule.getGroup('bridge-group', 3)

    expect(group).to.deep.equal([3, 4, 5, 6])
  })
})
