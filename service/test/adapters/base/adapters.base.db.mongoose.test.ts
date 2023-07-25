import mongoose from 'mongoose'
import { describe, it, before, beforeEach, after, afterEach } from 'mocha'
import { expect } from 'chai'
import '../../mongo.test'
import { mongoTestAfterAllHook, mongoTestBeforeAllHook, MongoTestContext } from '../../mongo.test'
import { BaseMongooseRepository, pageQuery } from '../../../lib/adapters/base/adapters.base.db.mongoose'
import Substitute, { Arg } from '@fluffy-spoon/substitute'
import { PagingParameters } from '../../../src/entities/entities.global'
import uniqid from 'uniqid'
import _ from 'lodash'

describe('mongoose adapter layer base', function() {

  interface BaseEntity {
    id: string
    derp: string
    lerp?: string
    squee?: boolean
    noo?: number
  }
  type BaseDocument = BaseEntity & mongoose.Document
  type BaseModel = mongoose.Model<BaseDocument>

  const collection = 'base'
  const schema = new mongoose.Schema({
    derp: { type: String, required: true },
    lerp: { type: String, required: false },
    squee: { type: Boolean, required: false, default: false },
    noo: { type: Number, required: false, default: -1 },
  }, {
    toJSON: {
      getters: true,
      versionKey: false,
    }
  })
  let mongo: MongoTestContext
  let model: mongoose.Model<BaseDocument>
  let repo: BaseMongooseRepository<BaseDocument, BaseModel, BaseEntity>

  before(mongoTestBeforeAllHook())

  before('create model', function() {
    mongo = this.mongo!
    model = mongo.conn.model('Base', schema, collection)
    repo = new BaseMongooseRepository(model)
  })

  afterEach('clear db', async function() {
    await model.remove({})
  })

  after(mongoTestAfterAllHook())

  describe('repository', function() {

    it('creates a record', async function() {

      const seed: Partial<BaseEntity> = {
        derp: 'sloo',
        lerp: 'noich',
        squee: true,
        noo: 37
      }
      const created = await repo.create({
        id: 'ignore',
        ...seed
      })
      const read = await mongo.conn.db.collection(model.collection.name).find().toArray()

      expect(created.id).to.not.be.empty
      expect(created.id).to.not.equal('ignore')
      expect(created).to.deep.include(seed)
      expect(read.length).to.equal(1)
      expect(read[0]).to.deep.include(seed)
    })

    it('reads all records', async function() {

      const seed1: Partial<BaseEntity> = {
        derp: 'bam',
        lerp: 'plop',
        squee: true,
        noo: 11
      }
      const seed2: Partial<BaseEntity> = {
        derp: 'sloo',
        lerp: 'tum',
        squee: false,
        noo: 22
      }
      await Promise.all([
        repo.create(seed1),
        repo.create(seed2)
      ])
      const all = await repo.findAll()

      expect(all.length).to.equal(2)
      expect(all[0]).to.deep.include(seed1)
      expect(all[1]).to.deep.include(seed2)
    })

    it('finds a record by id', async function() {

      const seed1: Partial<BaseEntity> = {
        derp: 'bam',
        lerp: 'plop',
        squee: true,
        noo: 11
      }
      const seed2: Partial<BaseEntity> = {
        derp: 'sloo',
        lerp: 'tum',
        squee: false,
        noo: 22
      }
      const created = await Promise.all([
        repo.create(seed1),
        repo.create(seed2)
      ])
      const found = (await repo.findById(created[1].id))!

      expect(created.length).to.equal(2)
      expect(found).to.deep.include(seed2)
      expect(found.id).to.equal(created[1].id)
      expect(found.id).to.not.equal(created[0].id)
    })

    it('updates a record', async function() {

      const seed: Partial<BaseEntity> = {
        derp: 'spor',
        lerp: 'jeb',
        squee: true,
        noo: 39
      }
      const existing = await repo.create(seed)
      const update = {
        id: existing.id,
        derp: 'sped',
        lerp: 'jebler',
        noo: 42
      }
      const beforeUpdate = await repo.findAll()
      const updated = await repo.update(update)
      const afterUpdate = await repo.findAll()

      expect(updated).to.deep.include(update)
      expect(beforeUpdate.length).to.equal(1)
      expect(afterUpdate.length).to.equal(1)
      expect(beforeUpdate[0]).to.deep.include(seed)
      expect(afterUpdate[0]).to.deep.include(update)
      expect(beforeUpdate[0]).to.not.deep.include(Object.assign({ ...seed }, update))
    })

    it('can remove properties in an update', async function() {

      const seed: Partial<BaseEntity> = {
        derp: 'spor',
        lerp: 'jeb',
        squee: true,
        noo: 39
      }
      const existing = await repo.create(seed)
      const update = {
        id: existing.id,
        lerp: undefined
      }
      const beforeUpdate = await repo.findAll()
      const updated = await repo.update(update)
      const afterUpdate = await repo.findAll()

      expect(beforeUpdate[0]).to.deep.include(seed)
      expect(afterUpdate[0]).to.not.have.property('lerp')
      expect(updated).to.deep.equal(afterUpdate[0])
    })

    it('deletes a record', async function() {

      const seed: Partial<BaseEntity> = {
        derp: 'spor',
        lerp: 'jeb',
        squee: true,
        noo: 39
      }
      const created = await repo.create(seed)
      const beforeDelete = await repo.findAll()
      const removed = await repo.removeById(created.id)
      const afterDelete = await repo.findAll()

      expect(beforeDelete.length).to.equal(1)
      expect(beforeDelete[0]).to.deep.include(seed)
      expect(afterDelete.length).to.equal(0)
      expect(removed).to.deep.equal(created)
    })

    it('returns null if the delete id does not exist', async function() {

      const removed = await repo.removeById(mongoose.Types.ObjectId().toHexString())
      expect(removed).to.be.null
    })

    describe('find all by id', function() {

      it('finds records for given ids', async function() {

        const seeds: Partial<BaseEntity>[] = [
          {
            derp: 'nar',
            lerp: 'bur',
            squee: false,
            noo: 8
          },
          {
            derp: 'loo',
            lerp: 'doo',
            squee: true,
            noo: 22
          },
          {
            derp: 'taw',
            lerp: 'tee',
            squee: true,
            noo: 700
          }
        ]
        const created = await Promise.all(seeds.map(x => repo.create(x)))
        const found = await repo.findAllByIds([ created[1].id, created[2].id ])

        expect(found).to.deep.equal({
          [created[1].id]: created[1],
          [created[2].id]: created[2]
        })
      })

      it('sets unfound id keys to null', async function() {

        const seed: Partial<BaseEntity> = {
          derp: 'nar',
          lerp: 'bur',
          squee: false,
          noo: 8
        }
        const created = await repo.create(seed)
        const ids = [ mongoose.Types.ObjectId().toHexString(), created.id, mongoose.Types.ObjectId().toHexString() ]
        const found = await repo.findAllByIds(ids)

        expect(found).to.deep.equal({
          [created.id]: created,
          [ids[0]]: null,
          [ids[2]]: null
        })
      })

      it('resolves empty object without querying when id list is empty', async function() {

        const mockModel = Substitute.for<mongoose.Model<BaseDocument>>()
        const disconnectedRepo = new BaseMongooseRepository<BaseDocument, BaseModel, BaseEntity>(mockModel)
        const found = await disconnectedRepo.findAllByIds([])

        expect(found).to.deep.equal({})
        mockModel.didNotReceive().find(Arg.all())
        mockModel.didNotReceive().findById(Arg.all())
        mockModel.didNotReceive().findOne(Arg.all())
      })
    })
  })

  describe('query paging utility', function() {

    it('adds paging to a query without total count', async function() {

      const baseQuery = Substitute.for<mongoose.DocumentQuery<BaseDocument[], BaseDocument>>()
      const BaseQuery = function(this: mongoose.DocumentQuery<BaseDocument[], BaseDocument>): mongoose.DocumentQuery<BaseDocument[], BaseDocument> {
        this.count = function(): mongoose.Query<number> {
          return Promise.reject() as unknown as mongoose.Query<number>
        }
        return baseQuery
      } as unknown as (new (...args: any[]) => mongoose.DocumentQuery<unknown, mongoose.Document>)
      baseQuery.toConstructor().returns(BaseQuery)
      baseQuery.limit(Arg.any()).returns(baseQuery)
      baseQuery.skip(Arg.any()).returns(baseQuery)
      const paging: PagingParameters = {
        pageSize: 40,
        pageIndex: 3,
        includeTotalCount: false
      }
      pageQuery(baseQuery, paging)

      baseQuery.received().limit(40)
      baseQuery.received().skip(3 * 40)
      baseQuery.didNotReceive().count(Arg.all())
    })

    it('returns the total count if requested', async function() {

      const baseQuery = Substitute.for<mongoose.DocumentQuery<BaseDocument[], BaseDocument>>()
      const BaseQuery = function(this: mongoose.DocumentQuery<BaseDocument[], BaseDocument>): mongoose.DocumentQuery<BaseDocument[], BaseDocument> {
        return Object.create(baseQuery, {
          count: {
            get: () => function() {
              return Promise.resolve(999) as unknown as mongoose.Query<number>
            }
          }
        })
      } as unknown as (new (...args: any[]) => mongoose.DocumentQuery<unknown, mongoose.Document>)
      baseQuery.toConstructor().returns(BaseQuery)
      baseQuery.limit(Arg.any()).returns(baseQuery)
      baseQuery.skip(Arg.any()).returns(baseQuery)
      const paging: PagingParameters = {
        pageSize: 40,
        pageIndex: 3,
        includeTotalCount: true
      }
      const pagedQuery = await pageQuery(baseQuery, paging)

      baseQuery.received().limit(40)
      baseQuery.received().skip(3 * 40)
      expect(pagedQuery.totalCount).to.equal(999)
    })

    it('includes total count when total count parameter is absent and page index is 0', async function() {

      const baseQuery = Substitute.for<mongoose.DocumentQuery<BaseDocument[], BaseDocument>>()
      const BaseQuery = function(this: mongoose.DocumentQuery<BaseDocument[], BaseDocument>): mongoose.DocumentQuery<BaseDocument[], BaseDocument> {
        return Object.create(baseQuery, {
          count: {
            get: () => function() {
              return Promise.resolve(999) as unknown as mongoose.Query<number>
            }
          }
        })
      } as unknown as (new (...args: any[]) => mongoose.DocumentQuery<unknown, mongoose.Document>)
      baseQuery.toConstructor().returns(BaseQuery)
      baseQuery.limit(Arg.any()).returns(baseQuery)
      baseQuery.skip(Arg.any()).returns(baseQuery)
      const paging: PagingParameters = {
        pageSize: 40,
        pageIndex: 0
      }
      const pagedQuery = await pageQuery(baseQuery, paging)

      baseQuery.received().limit(40)
      baseQuery.received().skip(0)
      expect(pagedQuery.totalCount).to.equal(999)
    })

    it('does not include total count when total count parameter is absent and page index is greater than 0', async function() {

      const baseQuery = Substitute.for<mongoose.DocumentQuery<BaseDocument[], BaseDocument>>()
      const BaseQuery = function(this: mongoose.DocumentQuery<BaseDocument[], BaseDocument>): mongoose.DocumentQuery<BaseDocument[], BaseDocument> {
        return Object.create(baseQuery, {
          count: {
            get: () => function() {
              return Promise.reject() as unknown as mongoose.Query<number>
            }
          }
        })
      } as unknown as (new (...args: any[]) => mongoose.DocumentQuery<unknown, mongoose.Document>)
      baseQuery.toConstructor().returns(BaseQuery)
      baseQuery.limit(Arg.any()).returns(baseQuery)
      baseQuery.skip(Arg.any()).returns(baseQuery)
      const paging: PagingParameters = {
        pageSize: 40,
        pageIndex: 1
      }
      const pagedQuery = await pageQuery(baseQuery, paging)

      expect(pagedQuery.totalCount).to.be.null
      baseQuery.received().limit(40)
      baseQuery.received().skip(40)
    })

    it('works with total count', async function() {

      const bunchOfEntities: Partial<BaseEntity>[] = []
      let remaining = 100
      while (remaining--) {
        bunchOfEntities.push({
          derp: `derp.${remaining}`,
          squee: false,
          noo: -remaining
        })
      }
      const docs = await model.insertMany(bunchOfEntities)

      expect(docs.length).to.equal(100)

      const page = await pageQuery(model.find().sort({ noo: -1 }), { pageSize: 10, pageIndex: 2, includeTotalCount: false })

      expect(page.totalCount).to.be.null

      const pageItems = await page.query

      expect(pageItems.length).to.equal(10)
      expect(pageItems.map(x => _.omit(x.toJSON(), '_id', 'id'))).to.deep.equal(bunchOfEntities.sort((a, b) =>  b.noo! - a.noo!).slice(20, 30))
    })

    it('works without total count', async function() {

      const bunchOfEntities: Partial<BaseEntity>[] = []
      let remaining = 100
      while (remaining--) {
        bunchOfEntities.push({
          derp: `derp.${remaining}`,
          squee: false,
          noo: -remaining
        })
      }
      const docs = await model.insertMany(bunchOfEntities)

      expect(docs.length).to.equal(100)

      const page = await pageQuery(model.find().sort({ noo: -1 }), { pageSize: 10, pageIndex: 2, includeTotalCount: true })
      const pageItems = await page.query

      expect(page.totalCount).to.equal(100)
      expect(pageItems.length).to.equal(10)
      expect(pageItems.map(x => _.omit(x.toJSON(), '_id', 'id'))).to.deep.equal(bunchOfEntities.sort((a, b) =>  b.noo! - a.noo!).slice(20, 30))
    })
  })
})