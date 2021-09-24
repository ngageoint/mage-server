import { expect } from 'chai'
import _ from 'lodash'
import mongoose from 'mongoose'
import { Arg, Substitute as Sub, SubstituteOf } from '@fluffy-spoon/substitute'
import { User } from '../../../lib/entities/users/entities.users'
import * as legacy from '../../../lib/models/user'
import { MongooseUserRepository, UserDocument } from '../../../lib/adapters/users/adapters.users.db.mongoose'
import x from 'uniqid'



describe('users mongoose repository', function() {

  let model: mongoose.Model<UserDocument>
  let repo: MongooseUserRepository

  before(async function() {
    model = legacy.Model as mongoose.Model<UserDocument>
    repo = new MongooseUserRepository(model)
  })

  describe('document to entity transform', function() {

    afterEach(async function() {
      await model.remove({})
    })

    it('transforms object ids to strings', async function() {

      const stub: Partial<User> = {
        id: mongoose.Types.ObjectId().toHexString(),
        username: 'doc2entity',
        displayName: 'Doc 2 Entity',
        roleId: mongoose.Types.ObjectId().toHexString(),
        authenticationId: mongoose.Types.ObjectId().toHexString(),
        active: true,
        enabled: true,
      }
      const doc = await model.create({ ...stub, _id: mongoose.Types.ObjectId(stub.id) })
      const entity = repo.entityForDocument(doc)

      expect(entity).to.deep.include(stub)
    })

    it('retains js dates', async function() {

      const stub: Partial<User> = {
        id: mongoose.Types.ObjectId().toHexString(),
        username: 'doc2entity',
        displayName: 'Doc 2 Entity',
        roleId: mongoose.Types.ObjectId().toHexString(),
        authenticationId: mongoose.Types.ObjectId().toHexString(),
        active: true,
        enabled: true,
      }
      const doc = await model.create({ ...stub, _id: mongoose.Types.ObjectId(stub.id) })
      const entity = repo.entityForDocument(doc)

      expect(entity.createdAt).to.be.instanceOf(Date)
      expect(entity.lastUpdated).to.be.instanceOf(Date)
    })
  })

  describe('finding users', function() {

    const authenticationId = mongoose.Types.ObjectId().toHexString()
    const roleId = mongoose.Types.ObjectId().toHexString()
    let allUsers: User[]

    before(async function() {

      const users: Partial<User>[] = Array.from({ length: 1000 }, (_, pos) => {
        pos += 1
        return {
          username: `test${pos}`,
          displayName: `Test ${pos}`,
          email: `test${pos}@mage.test${pos % 5}`,
          phones: [ { number: `${String(pos - 1).padStart(3, '0')}-9999`, type: 'test' } ],
          active: pos % 2 === 0,
          enabled: pos % 4 === 0,
          authenticationId,
          roleId,
        }
      })
      const docs = await model.insertMany(users.slice())
      allUsers = docs.map(repo.entityForDocument).sort((a, b) => a.displayName.localeCompare(b.displayName))
    })

    after(async function() {
      await model.remove({})
    })

    it('supports paging', async function() {

      const page = await repo.find({ pageSize: 23, pageIndex: 2, includeTotalCount: true })

      expect(page.totalCount).to.equal(1000)
      expect(page.items.length).to.equal(23)
      expect(page.items).to.deep.equal(allUsers.slice(46, 69))
    })

    it('filters by active flag', async function() {

      const page = await repo.find({ active: true, pageSize: allUsers.length, pageIndex: 0 })
      const activeUsers = allUsers.filter(x => x.active)

      expect(page.totalCount).to.equal(activeUsers.length)
      expect(page.items).to.deep.equal(activeUsers)
    })

    it('filters by enabled flag', async function() {

      const page = await repo.find({ enabled: true, pageSize: allUsers.length, pageIndex: 0 })
      const enabledUsers = allUsers.filter(x => x.enabled)

      expect(page.totalCount).to.equal(enabledUsers.length)
      expect(page.items).to.deep.equal(enabledUsers)
    })

    it('filters by search term matching username and email', async function() {

      const found = await repo.find({ nameOrContactTerm: 'test2', pageSize: allUsers.length, pageIndex: 0 })
      const matching = allUsers.filter(x => /Test 5/.test(x.username) || /test2/.test(x.email!))

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
    })

    it('filters by everything', async function() {

      const found = await repo.find({ nameOrContactTerm: 'Test 3', active: true, enabled: false, pageSize: allUsers.length, pageIndex: 0 })
      const matching = allUsers.filter(x => /Test 3/.test(x.displayName) && x.active && !x.enabled)

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
    })

    it('sorts on display name ascending consistently', async function() {

      const mockModel: SubstituteOf<mongoose.Model<UserDocument>> = Sub.for<mongoose.Model<UserDocument>>()
      const mockQuery = Sub.for<mongoose.DocumentQuery<UserDocument[], UserDocument>>()
      mockModel.find(Arg.all()).returns(mockQuery)
      mockQuery.sort(Arg.all()).returns(mockQuery)
      mockQuery.toConstructor().returns(function() { return mockQuery } as any)
      mockQuery.limit(Arg.all()).returns(mockQuery)
      mockQuery.skip(Arg.all()).returns(mockQuery)

      const repo = new MongooseUserRepository(mockModel)
      const found = await repo.find({ pageSize: 0, pageIndex: 0, includeTotalCount: false })

      expect(found.items).to.deep.equal([])
      // per https://docs.mongodb.com/v5.0/reference/method/cursor.sort/#sort-consistency,
      // add _id to sort to ensure consistent ordering
      mockQuery.received(1).sort('displayName _id')
    })

    it('uses the provided mapping', async function() {

      const found = await repo.find({ nameOrContactTerm: 'Test 31', pageSize: allUsers.length, pageIndex: 0 }, x => x.username)
      const matching = allUsers.filter(x => /Test 31/.test(x.displayName)).map(x => x.username)

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
      expect(found.items[0]).to.equal('test31')
    })

    describe('search term', function() {

      const userStubs: Partial<User>[] = [
        {
          id: mongoose.Types.ObjectId().toHexString(),
          username: 'bim',
          displayName: 'Bam Blor',
          email: 'tip@top.nop',
          phones: [
            { type: 'phone1', number: '+01 321-654-0987' },
            { type: 'phone2', number: '+01 123-654-7890' }
          ],
          active: true,
          enabled: true,
          authenticationId,
          roleId,
        },
        {
          id: mongoose.Types.ObjectId().toHexString(),
          username: 'flim',
          displayName: 'Flam Flor',
          email: 'dorp@top.nop',
          phones: [
            { type: 'phone1', number: '+01 123-456-7890' }
          ],
          active: true,
          enabled: true,
          authenticationId,
          roleId,
        },
      ]
      let users: User[]

      beforeEach(async function() {

        const docs = await model.create(userStubs.map(x => ({ ...x, _id: mongoose.Types.ObjectId(x.id) })))
        users = docs.map(repo.entityForDocument).sort((a, b) => a.displayName.localeCompare(b.displayName))

        userStubs.forEach((stub, pos) => {
          expect(users[pos]).to.deep.include(stub)
        })
      })

      afterEach(async function() {
        await model.remove({ _id: { $in: users.map(x => x.id) }})
      })

      it('matches username', async function() {

        const found = await repo.find({ nameOrContactTerm: 'flim', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([ users[1] ])
      })

      it('matches display name', async function() {

        const found = await repo.find({ nameOrContactTerm: 'lor', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('matches email', async function() {

        const found = await repo.find({ nameOrContactTerm: '@top.nop', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('matches phone numbers', async function() {

        let found = await repo.find({ nameOrContactTerm: '+01 321', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([ users[0] ])

        found = await repo.find({ nameOrContactTerm: '+01 123', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('is case-insensitive', async function() {

        let found = await repo.find({ nameOrContactTerm: 'FLIM', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([ users[1] ])
      })
    })
  })
})