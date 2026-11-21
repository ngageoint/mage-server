import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseLayerRepository,
  LayerModel,
} from '../../../lib/adapters/layers/adapters.layers.db.mongoose'
import { SequenceRepository } from '../../../lib/entities/entities.global'

class StubSequenceRepository implements SequenceRepository {
  private sequences: Record<string, number> = {}

  async nextValue(name: string): Promise<number> {
    this.sequences[name] = (this.sequences[name] || 0) + 1
    return this.sequences[name]
  }
}

describe('MongooseLayerRepository', function() {
  let mongo: MongoMemoryServer
  let conn: mongoose.Connection
  let sequenceRepo: StubSequenceRepository
  let model: ReturnType<typeof LayerModel>
  let repo: MongooseLayerRepository
  let removedFromEventsFor: number[]

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

  beforeEach(function() {
    sequenceRepo = new StubSequenceRepository()
    model = LayerModel(conn)
    removedFromEventsFor = []
    repo = new MongooseLayerRepository(model, sequenceRepo, async (layerId) => {
      removedFromEventsFor.push(layerId)
    })
  })

  afterEach(async function() {
    await model.deleteMany({})
  })

  describe('nextLayerId', function() {
    it('delegates to the sequence repository under the "layer" sequence name', async function() {
      const id = await repo.nextLayerId()
      expect(id).to.equal(1)
    })
  })

  describe('create', function() {
    it('creates a default/Imagery layer with the given id', async function() {
      const id = await repo.nextLayerId()
      const created = await repo.create(id, { name: 'imagery-layer', type: 'Imagery', state: 'available' })

      expect(created.id).to.equal(String(id))
      expect(created.type).to.equal('Imagery')
    })

    it('creates a Feature layer carrying its collectionName', async function() {
      const id = await repo.nextLayerId()
      const created = await repo.create(id, {
        name: 'feature-layer',
        type: 'Feature',
        state: 'available',
        collectionName: `features${id}`
      })

      expect(created.collectionName).to.equal(`features${id}`)
    })
  })

  describe('findMany / findById', function() {
    it('excludes unavailable layers by default', async function() {
      const availableId = await repo.nextLayerId()
      await repo.create(availableId, { name: 'available-layer', type: 'Imagery', state: 'available' })
      const unavailableId = await repo.nextLayerId()
      await repo.create(unavailableId, { name: 'unavailable-layer', type: 'Imagery', state: 'unavailable' })
      const found = await repo.findMany({})

      expect(found).to.have.length(1)
      expect(found[0].id).to.equal(String(availableId))
    })

    it('includes unavailable layers when requested', async function() {
      const id = await repo.nextLayerId()
      await repo.create(id, { name: 'unavailable-layer-2', type: 'Imagery', state: 'unavailable' })
      const found = await repo.findMany({ includeUnavailable: true })

      expect(found).to.have.length(1)
    })

    it('counts all layers regardless of state', async function() {
      const id = await repo.nextLayerId()
      await repo.create(id, { name: 'counted-layer', type: 'Imagery', state: 'unavailable' })

      expect(await repo.count()).to.equal(1)
    })

    it('finds a layer by id', async function() {
      const id = await repo.nextLayerId()
      await repo.create(id, { name: 'findable-layer', type: 'Imagery', state: 'available' })
      const found = await repo.findById(id)

      expect(found?.id).to.equal(String(id))
    })
  })

  describe('update', function() {
    it('updates a layer through its discriminator', async function() {
      const id = await repo.nextLayerId()
      await repo.create(id, { name: 'update-me', type: 'Imagery', state: 'available', url: 'http://old' })
      const updated = await repo.update(id, { type: 'Imagery', url: 'http://new' })

      expect(updated?.url).to.equal('http://new')
    })
  })

  describe('remove', function() {

    it('removes the layer', async function() {
      const id = await repo.nextLayerId()
      const created = await repo.create(id, { name: 'remove-me', type: 'Imagery', state: 'available' })
      await repo.remove(created)

      expect(await repo.findById(id)).to.be.null
    })

    it('removes the layer from events before deleting it', async function() {
      const id = await repo.nextLayerId()
      const created = await repo.create(id, { name: 'remove-me-2', type: 'Imagery', state: 'available' })
      await repo.remove(created)

      expect(removedFromEventsFor).to.deep.equal([id])
    })
  })
})
