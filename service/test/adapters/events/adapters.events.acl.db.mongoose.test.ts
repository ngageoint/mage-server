import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MageEventModel } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseEventAclRepository } from '../../../lib/adapters/events/adapters.events.acl.db.mongoose'
import * as legacy from '../../../lib/models/event'
import { MageEventModelInstance } from '../../../lib/models/event'
import TeamModelModule = require('../../../lib/models/team')
import { EventAccessType, EventRole, MageEventCreateAttrs } from '../../../lib/entities/events/entities.events'

const TeamModel = TeamModelModule.Model

describe('event acl mongoose repository', function () {

  let model: MageEventModel
  let repo: MongooseEventAclRepository
  let eventDoc: MageEventModelInstance

  const createEvent = (attrs: MageEventCreateAttrs): Promise<MageEventModelInstance> => {
    return new Promise<MageEventModelInstance>((resolve, reject) => {
      legacy.create(attrs, { _id: new mongoose.Types.ObjectId() }, (err: any | null, event?: MageEventModelInstance) => {
        if (err) {
          return reject(err)
        }
        resolve(event!)
      })
    })
  }

  const storedAcl = async (): Promise<Record<string, string>> => {
    const event = await model.findById(eventDoc._id)
    return (event as any)?.acl || {}
  }

  beforeEach(async function () {
    model = legacy.Model as any
    repo = new MongooseEventAclRepository(model)
    eventDoc = await createEvent({
      name: `Acl Test Event ${new mongoose.Types.ObjectId().toHexString()}`,
      description: 'For testing'
    })
  })

  afterEach(async function () {
    await model.deleteMany({})
    // creating an event also creates its event team
    await TeamModel.deleteMany({})
  })

  describe('setting a user role', function () {

    it('adds the user to the event acl', async function () {

      const userId = new mongoose.Types.ObjectId().toHexString()

      const acl = await repo.setUserRole(eventDoc._id, userId, EventRole.MANAGER)

      expect(acl?.[userId]).to.deep.equal({
        role: EventRole.MANAGER,
        permissions: [ EventAccessType.Read, EventAccessType.Update ]
      })
      expect((await storedAcl())[userId]).to.equal(EventRole.MANAGER)
    })

    it('changes the role of a user already in the acl', async function () {

      const userId = new mongoose.Types.ObjectId().toHexString()
      await repo.setUserRole(eventDoc._id, userId, EventRole.GUEST)

      const acl = await repo.setUserRole(eventDoc._id, userId, EventRole.OWNER)

      expect(acl?.[userId].role).to.equal(EventRole.OWNER)
      expect((await storedAcl())[userId]).to.equal(EventRole.OWNER)
    })

    it('returns null if the event does not exist', async function () {

      const acl = await repo.setUserRole(eventDoc._id + 1000, new mongoose.Types.ObjectId().toHexString(), EventRole.GUEST)

      expect(acl).to.be.null
    })
  })

  describe('removing a user', function () {

    it('removes the user from the event acl', async function () {

      const keep = new mongoose.Types.ObjectId().toHexString()
      const remove = new mongoose.Types.ObjectId().toHexString()
      await repo.setUserRole(eventDoc._id, keep, EventRole.OWNER)
      await repo.setUserRole(eventDoc._id, remove, EventRole.GUEST)

      const acl = await repo.removeUser(eventDoc._id, remove)

      expect(acl).to.have.property(keep)
      expect(acl).not.to.have.property(remove)
      expect(await storedAcl()).not.to.have.property(remove)
    })

    it('returns null if the event does not exist', async function () {

      const acl = await repo.removeUser(eventDoc._id + 1000, new mongoose.Types.ObjectId().toHexString())

      expect(acl).to.be.null
    })
  })
})
