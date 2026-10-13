import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongooseLayerRepository, LayerModel } from '../../lib/adapters/layers/adapters.layers.db.mongoose'
import { SequenceRepository } from '../../lib/entities/entities.global'

class StubSequenceRepository implements SequenceRepository {
  // starts well above any id a migration may have already seeded into the
  // shared 'layers' collection on the default connection
  private sequence = 1000000

  async nextValue(): Promise<number> {
    this.sequence += 1
    return this.sequence
  }
}

describe('layer model legacy bridge', function() {

  let layerModule: any
  let layerModel: ReturnType<typeof LayerModel>

  before(function() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    layerModule = require('../../lib/models/layer')
    layerModel = LayerModel(mongoose.connection)
    layerModule.initialize({ layerRepo: new MongooseLayerRepository(layerModel, new StubSequenceRepository(), async () => { }) })
  })

  afterEach(async function() {
    await layerModel.deleteMany({})
  })

  it('nextLayerId and create round-trip an Imagery layer', async function() {
    const id = await layerModule.nextLayerId()
    const created = await layerModule.create(id, { name: 'bridge-imagery-' + id, type: 'Imagery', state: 'available' })

    expect(created.id).to.equal(String(id))

    const found = await layerModule.getById(id)
    expect(found?.id).to.equal(String(id))
  })

  it('getLayers excludes unavailable layers by default', async function() {
    const id = await layerModule.nextLayerId()
    await layerModule.create(id, { name: 'bridge-unavailable-' + id, type: 'Imagery', state: 'unavailable' })
    const found = await layerModule.getLayers({})

    expect(found).to.have.length(0)
  })

  it('update modifies a layer through its discriminator', async function() {
    const id = await layerModule.nextLayerId()
    await layerModule.create(id, { name: 'bridge-update-' + id, type: 'Imagery', state: 'available', url: 'http://old' })
    const updated = await layerModule.update(id, { type: 'Imagery', url: 'http://new' })

    expect(updated.url).to.equal('http://new')
  })

  it('remove deletes the layer', async function() {
    const id = await layerModule.nextLayerId()
    const created = await layerModule.create(id, { name: 'bridge-remove-' + id, type: 'Imagery', state: 'available' })
    await layerModule.remove(created)

    expect(await layerModule.getById(id)).to.be.null
  })
})

describe('layer model default (no initialize() call)', function() {

  let freshLayerModule: any

  before(function() {
    delete require.cache[require.resolve('../../lib/models/layer')]
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    freshLayerModule = require('../../lib/models/layer')
  })

  afterEach(async function() {
    const model = LayerModel(mongoose.connection)
    await model.deleteMany({ name: /^default-bridge-/ })
  })

  it('remove() does not throw without an explicit initialize() call', async function() {
    const id = await freshLayerModule.nextLayerId()
    const created = await freshLayerModule.create(id, { name: 'default-bridge-remove-' + id, type: 'Imagery', state: 'available' })
    await freshLayerModule.remove(created)

    expect(await freshLayerModule.getById(id)).to.be.null
  })
})
