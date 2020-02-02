
import mongoose from 'mongoose'
import mongodb from 'mongodb'
import { describe, it, before, beforeEach, after, afterEach } from 'mocha'
import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { AdapterRepository } from '../../../../plugins/mage-manifold/repositories'
import { AdapterDescriptor, AdapterDescriptorModel, ManifoldModels, AdapterDescriptorSchema } from '../../../../plugins/mage-manifold/models';

describe.only('manifold repositories', function() {

  describe('adapter repository', async function() {

    const collection = 'adapters'

    let db: MongoMemoryServer
    let conn: mongoose.Connection
    let model: AdapterDescriptorModel
    let repo: AdapterRepository

    before(async function() {
      db = new MongoMemoryServer()
      const uri = await db.getUri('adapter_repository')
      conn = await mongoose.createConnection(uri, {
        useMongoClient: true
      })
      model = conn.model(ManifoldModels.AdapterDescriptor, AdapterDescriptorSchema, collection)
      repo = new AdapterRepository(model)
    })

    after(async function() {
      const stopped = await db.stop()
      expect(stopped).to.be.true
    })

    it('creates an adatper descriptor record', async function() {

      const seed: AdapterDescriptor = {
        title: 'Xyz Adapter',
        description: 'Adapting Xyz services',
        isReadable: true,
        isWritable: true,
        libPath: '/var/mage/manifold/xyz'
      }

      const created = await repo.create({
        id: 'ignore',
        ...seed
      })
      const read = await conn.db.collection(collection).find().toArray()

      expect(created.id).to.not.be.empty
      expect(created.id).to.not.equal('ignore')
      expect(created).to.deep.include(seed)
      expect(read.length).to.equal(1)
      expect(read[0]).to.deep.include(seed)
    })

    it('reads all adapter descriptor records', async function() {

    })

    it('updates an adapter descriptor record', async function() {

    })

    it('deletes an adapter descriptor record', async function() {

    })
  })

  describe('source repository', function() {

  })
})
