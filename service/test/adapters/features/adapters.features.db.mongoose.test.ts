import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  MongooseFeatureRepository,
  FeatureModel,
} from '../../../lib/adapters/features/adapters.features.db.mongoose'

describe('MongooseFeatureRepository', function() {
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

  describe('FeatureModel', function() {

    it('returns the same model instance for the same collection name', function() {
      const a = FeatureModel(conn, 'features_cache_test')
      const b = FeatureModel(conn, 'features_cache_test')

      expect(a).to.equal(b)
    })

    it('returns independent models for different collection names', function() {
      const a = FeatureModel(conn, 'features_independent_a')
      const b = FeatureModel(conn, 'features_independent_b')

      expect(a).to.not.equal(b)
      expect(a.collection.name).to.equal('features_independent_a')
      expect(b.collection.name).to.equal('features_independent_b')
    })
  })

  describe('findAll / createMany', function() {

    let model: ReturnType<typeof FeatureModel>
    let repo: MongooseFeatureRepository

    beforeEach(function() {
      model = FeatureModel(conn, 'test_features')
      repo = new MongooseFeatureRepository(model)
    })

    afterEach(async function() {
      await model.deleteMany({})
    })

    it('creates features, defaulting missing properties to an empty object', async function() {
      const created = await repo.createMany([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] } }
      ])

      expect(created).to.have.length(1)
      expect(created[0].toJSON().properties).to.deep.equal({})
    })

    it('finds all features in the layer collection', async function() {
      await repo.createMany([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 2] }, properties: { name: 'a' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [3, 4] }, properties: { name: 'b' } }
      ])

      const found = await repo.findAll()

      expect(found.map(f => f.toJSON().properties.name)).to.have.members(['a', 'b'])
    })

    it('returns documents whose toJSON() replaces _id with id', async function() {
      const [created] = await repo.createMany([{ type: 'Feature', geometry: null }])
      const json: any = created.toJSON()

      expect(json.id).to.exist
      expect(json).to.not.have.property('_id')
    })
  })
})
