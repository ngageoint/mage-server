import { expect } from 'chai'
import mongoose from 'mongoose'
import { User } from '../../../lib/entities/users/entities.users'
import * as legacy from '../../../lib/models/user'
import { MongooseUserRepository, UserDocument } from '../../../lib/adapters/users/adapters.users.db.mongoose'
import { userEntityForDocument } from '../../../lib/adapters/users/adapters.users.db.mongoose'


describe.only('users mongoose repository', function () {

  let model: mongoose.Model<UserDocument>
  let repo: MongooseUserRepository

  before(async function () {
    model = legacy.Model as mongoose.Model<UserDocument>
    repo = new MongooseUserRepository(model)
  })

  describe('document to entity transform', function () {

    afterEach(async function () {
      await model.deleteMany({})
    })

    it('transforms object ids to strings', async function () {

      const stub: Partial<User> = {
        id: (new mongoose.Types.ObjectId()).toHexString(),
        username: 'doc2entity',
        displayName: 'Doc 2 Entity',
        roleId: new mongoose.Types.ObjectId().toHexString(),
        authenticationId: new mongoose.Types.ObjectId().toHexString(),
        active: true,
        enabled: true,
      }
      await model.create({ ...stub, _id: new mongoose.Types.ObjectId(stub.id) })
      const entity = await repo.findById(stub.id!)

      expect(entity).to.deep.include(stub)
    })

    it('retains js dates', async function () {

      const stub: Partial<User> = {
        id: (new mongoose.Types.ObjectId()).toHexString(),
        username: 'doc2entity',
        displayName: 'Doc 2 Entity',
        roleId: (new mongoose.Types.ObjectId()).toHexString(),
        authenticationId: (new mongoose.Types.ObjectId()).toHexString(),
        active: true,
        enabled: true,
      }
      const doc = await model.create({ ...stub, _id: new mongoose.Types.ObjectId(stub.id) })
      const entity = await repo.findById(doc.id)

      expect(entity?.createdAt).to.be.instanceOf(Date)
      expect(entity?.lastUpdated).to.be.instanceOf(Date)
    })
  })

  describe('finding users', function () {

    const authenticationId = new mongoose.Types.ObjectId().toHexString()
    const roleId = new mongoose.Types.ObjectId().toHexString()
    let allUsers: User[]

    before(async function () {

      const users: UserDocument[] = Array.from({ length: 1000 }, (_, pos) => {
        pos += 1
        return {
          _id: new mongoose.Types.ObjectId(),
          username: `test${pos}`,
          displayName: `Test ${pos}`,
          email: `test${pos}@mage.test${pos % 5}`,
          phones: [{ number: `${String(pos - 1).padStart(3, '0')}-9999`, type: 'test' }],
          active: pos % 2 === 0,
          enabled: pos % 4 === 0,
          authenticationId: new mongoose.Types.ObjectId(authenticationId),
          roleId: new mongoose.Types.ObjectId(roleId),
          avatar: null,
          icon: null,
          createdAt: new Date(),
          lastUpdated: new Date(),
          recentEventIds: []
        }
      })
      const inserted = await model.insertMany<UserDocument>(users.slice(), { lean: true })
      allUsers = inserted.sort((a: any, b: any) => a.displayName.localeCompare(b.displayName)).map(userEntityForDocument)
    })

    after(async function () {
      await model.deleteMany({})
    })

    it('supports paging', async function () {

      const page = await repo.find({ pageSize: 23, pageIndex: 2, includeTotalCount: true })

      expect(page.totalCount).to.equal(1000)
      expect(page.items.length).to.equal(23)
      expect(page.items).to.deep.equal(allUsers.slice(46, 69))
    })

    it('filters by active flag', async function () {

      const page = await repo.find({ active: true, pageSize: allUsers.length, pageIndex: 0 })
      const activeUsers = allUsers.filter(x => x.active)

      page.items.forEach((user, pos) => {
        expect(user, String(pos)).to.deep.equal(activeUsers[pos])
      })
      expect(page.totalCount).to.equal(activeUsers.length)
      expect(page.items).to.deep.equal(activeUsers)
    })

    it('filters by enabled flag', async function () {

      const page = await repo.find({ enabled: true, pageSize: allUsers.length, pageIndex: 0 })
      const enabledUsers = allUsers.filter(x => x.enabled)

      expect(page.totalCount).to.equal(enabledUsers.length)
      expect(page.items).to.deep.equal(enabledUsers)
    })

    it('filters by search term matching username and email', async function () {

      const found = await repo.find({ nameOrContactTerm: 'test2', pageSize: allUsers.length, pageIndex: 0 })
      const matching = allUsers.filter(x => /Test 5/.test(x.username) || /test2/.test(x.email!))

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
    })

    it('filters by everything', async function () {

      const found = await repo.find({ nameOrContactTerm: 'Test 3', active: true, enabled: false, pageSize: allUsers.length, pageIndex: 0 })
      const matching = allUsers.filter(x => /Test 3/.test(x.displayName) && x.active && !x.enabled)

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
    })

    it('sorts on display name ascending consistently', async function () {
      const id1 = new mongoose.Types.ObjectId()
      const id2 = new mongoose.Types.ObjectId()
      const user1 = {
        ...allUsers[0],
        _id: id2,
        id: undefined,
        username: allUsers[0].username + '.id2',
      }
      const user2 = {
        ...allUsers[0],
        _id: id1,
        id: undefined,
        username: allUsers[0].username + '.id1',
      }
      const user1Created = userEntityForDocument(await model.create(user1))
      const user2Created = userEntityForDocument(await model.create(user2))

      for (let remaining = 10; remaining > 0; remaining--) {
        const found = await repo.find({ pageSize: allUsers.length, pageIndex: 0 })
        expect(found.items[0], 'item 0').to.deep.equal(allUsers[0])
        expect(found.items[1], 'item 1').to.deep.equal(user2Created)
        expect(found.items[2], 'item 2').to.deep.equal(user1Created)
      }
    })

    it('uses the provided mapping', async function () {

      const found = await repo.find({ nameOrContactTerm: 'Test 31', pageSize: allUsers.length, pageIndex: 0 }, x => x.username)
      const matching = allUsers.filter(x => /Test 31/.test(x.displayName)).map(x => x.username)

      expect(found.totalCount).to.equal(matching.length)
      expect(found.items).to.deep.equal(matching)
      expect(found.items[0]).to.equal('test31')
    })

    describe('search term', function () {

      const userStubs: Partial<UserDocument>[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'bim',
          displayName: 'Bam Blor',
          email: 'tip@top.nop',
          phones: [
            { type: 'phone1', number: '+01 321-654-0987' },
            { type: 'phone2', number: '+01 123-654-7890' }
          ],
          active: true,
          enabled: true,
          authenticationId: new mongoose.Types.ObjectId(authenticationId),
          roleId: new mongoose.Types.ObjectId(roleId),
          recentEventIds: [],
          avatar: null,
          icon: null,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          username: 'flim',
          displayName: 'Flam Flor',
          email: 'dorp@top.nop',
          phones: [
            { type: 'phone1', number: '+01 123-456-7890' }
          ],
          active: true,
          enabled: true,
          authenticationId: new mongoose.Types.ObjectId(authenticationId),
          roleId: new mongoose.Types.ObjectId(roleId),
          recentEventIds: [],
          avatar: null,
          icon: null,
        },
      ]
      let users: User[]

      beforeEach(async function () {

        const docs = await model.insertMany(userStubs, { lean: true }) as UserDocument[]
        users = docs.map(userEntityForDocument).sort((a, b) => a.displayName.localeCompare(b.displayName))
      })

      afterEach(async function () {
        await model.deleteMany({ _id: { $in: users.map(x => x.id) } })
      })

      it('matches username', async function () {

        const found = await repo.find({ nameOrContactTerm: 'flim', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([users[1]])
      })

      it('matches display name', async function () {

        const found = await repo.find({ nameOrContactTerm: 'lor', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('matches email', async function () {

        const found = await repo.find({ nameOrContactTerm: '@top.nop', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('matches phone numbers', async function () {

        let found = await repo.find({ nameOrContactTerm: '+01 321', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([users[0]])

        found = await repo.find({ nameOrContactTerm: '+01 123', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal(users)
      })

      it('is case-insensitive', async function () {

        const found = await repo.find({ nameOrContactTerm: 'FLIM', pageSize: users.length, pageIndex: 0 })

        expect(found.items).to.deep.equal([users[1]])
      })
    })
  })
})
