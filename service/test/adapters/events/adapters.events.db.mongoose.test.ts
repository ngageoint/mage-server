import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import uniqid from 'uniqid'
import _ from 'lodash'
import { MongooseMageEventRepository, MageEventModel } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import * as legacy from '../../../lib/models/event'
import { MageEventDocument } from '../../../lib/models/event'
import TeamModelModule = require('../../../lib/models/team')
import { Team } from '../../../lib/entities/teams/entities.teams'
import { MageEvent, MageEventCreateAttrs } from '../../../lib/entities/events/entities.events'

const TeamModel = TeamModelModule.TeamModel

describe('event mongoose repository', function() {

  let model: MageEventModel
  let repo: MongooseMageEventRepository
  let eventDoc: MageEventDocument
  let createEvent: (attrs: MageEventCreateAttrs & Partial<MageEvent>) => Promise<MageEventDocument>

  beforeEach('initialize model', async function() {
    model = legacy.Model as mongoose.Model<MageEventDocument>
    repo = new MongooseMageEventRepository(model)
    createEvent = (attrs: Partial<MageEvent>): Promise<MageEventDocument> => {
      return new Promise<MageEventDocument>((resolve, reject) => {
        legacy.create(
          attrs as MageEventCreateAttrs,
          { _id: mongoose.Types.ObjectId() },
          (err: any | null, event?: MageEventDocument) => {
            if (err) {
              return reject(err)
            }
            resolve(event!)
          })
      })
    }
    eventDoc = await createEvent({
      name: 'Test Event',
      description: 'For testing'
    })
    // fetch again, because the create method does not return the event with the
    // implicitly created team id in the teamIds list
    // TODO: fix the above
    eventDoc = await model.findById(eventDoc._id) as MageEventDocument
    expect(eventDoc._id).to.be.a('number')
  })

  afterEach(async function() {
    await model.remove({})
  })

  describe('finding events by id', function() {

    it('looks up a feed by id', async function() {

      const fetched = await repo.findById(eventDoc._id)
      expect(fetched).to.deep.equal(eventDoc.toJSON())
    })
  })

  describe('adding feeds to events', function() {

    it('adds a feed id when the feeds list does not exist', async function() {

      const repo = new MongooseMageEventRepository(model)
      const feedId = uniqid()
      const updated = await repo.addFeedsToEvent(eventDoc?._id, feedId)
      const fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal([ feedId ])
      expect(fetched).to.deep.equal(updated)
    })

    it('adds a feed id to a non-empty feeds list', async function() {

      const repo = new MongooseMageEventRepository(model)
      const feedIds = [ uniqid(), uniqid() ]
      let updated = await repo.addFeedsToEvent(eventDoc?._id, feedIds[0])
      let fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal([ feedIds[0] ])
      expect(fetched).to.deep.equal(updated)

      updated = await repo.addFeedsToEvent(eventDoc?._id, feedIds[1])
      fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal(feedIds)
      expect(fetched).to.deep.equal(updated)
    })

    it('adds multiple feed ids to the feeds list', async function() {

      const repo = new MongooseMageEventRepository(model)
      const feedIds = [ uniqid(), uniqid() ]
      let updated = await repo.addFeedsToEvent(eventDoc?._id, ...feedIds)
      let fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal(feedIds)
      expect(fetched).to.deep.equal(updated)
    })

    it('does not add duplicate feed ids', async function() {

      const repo = new MongooseMageEventRepository(model)
      const feedIds = [ uniqid(), uniqid() ]
      let updated = await repo.addFeedsToEvent(eventDoc?._id, ...feedIds)
      let fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal(feedIds)
      expect(fetched).to.deep.equal(updated)

      updated = await repo.addFeedsToEvent(eventDoc?._id, feedIds[0])
      fetched = await repo.findById(eventDoc?._id)

      expect(updated?.feedIds).to.deep.equal(feedIds)
      expect(fetched).to.deep.equal(updated)
    })

    it('returns null if the event does not exist', async function() {

      let typedEventDoc = eventDoc as MageEventDocument
      const updated = await repo.addFeedsToEvent(typedEventDoc.id - 1, uniqid())
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.be.empty
      expect(updated).to.be.null
      expect(fetched).to.deep.equal(typedEventDoc.toJSON())
    })
  })

  describe('removing feeds from an event', function() {

    it('removes a feed id from the list', async function() {

      const feedIds = Object.freeze([ uniqid(), uniqid() ])
      let typedEventDoc = eventDoc as MageEventDocument
      typedEventDoc.feedIds = [ ...feedIds ]
      typedEventDoc = await typedEventDoc.save()
      const updated = await repo.removeFeedsFromEvent(typedEventDoc.id, feedIds[0])
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.deep.equal(feedIds)
      expect(fetched!.feedIds).to.deep.equal([ feedIds[1]] )
      expect(updated).to.deep.equal(fetched)
    })

    it('removes multiple feed ids from the list', async function() {

      const feedIds = Object.freeze([ uniqid(), uniqid(), uniqid() ])
      let typedEventDoc = eventDoc as MageEventDocument
      typedEventDoc.feedIds = [ ...feedIds ]
      typedEventDoc = await typedEventDoc.save()
      const updated = await repo.removeFeedsFromEvent(typedEventDoc.id, feedIds[0], feedIds[2])
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.deep.equal(feedIds)
      expect(fetched!.feedIds).to.deep.equal([ feedIds[1]] )
      expect(updated).to.deep.equal(fetched)
    })

    it('has no affect if the feed ids are not in the list', async function() {

      const feedIds = Object.freeze([ uniqid(), uniqid(), uniqid() ])
      let typedEventDoc = eventDoc as MageEventDocument
      typedEventDoc.feedIds = [ ...feedIds ]
      typedEventDoc = await typedEventDoc.save()
      const updated = await repo.removeFeedsFromEvent(typedEventDoc.id, uniqid())
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.deep.equal(feedIds)
      expect(fetched!.feedIds).to.deep.equal(feedIds)
      expect(updated).to.deep.equal(fetched)
    })

    it('has no affect if the event feed ids list is empty', async function() {

      let typedEventDoc = eventDoc as MageEventDocument
      let updated = await repo.removeFeedsFromEvent(typedEventDoc.id, uniqid())
      let fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.be.empty
      expect(fetched!.feedIds).to.be.empty
      expect(updated).to.deep.equal(fetched)
    })

    it('removes the given feed ids that are in the list and ignores feed ids that are not', async function() {

      const feedIds = Object.freeze([ uniqid(), uniqid(), uniqid() ])
      let typedEventDoc = eventDoc as MageEventDocument
      typedEventDoc.feedIds = [ ...feedIds ]
      typedEventDoc = await typedEventDoc.save()
      const updated = await repo.removeFeedsFromEvent(typedEventDoc.id, feedIds[2], uniqid())
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.deep.equal(feedIds)
      expect(fetched!.feedIds).to.deep.equal([ feedIds[0], feedIds[1] ])
      expect(updated).to.deep.equal(fetched)
    })

    it('returns null if the event does not exist', async function() {

      const feedIds = Object.freeze([ uniqid(), uniqid(), uniqid() ])
      let typedEventDoc = eventDoc as MageEventDocument
      typedEventDoc.feedIds = [ ...feedIds ]
      typedEventDoc = await typedEventDoc.save()
      const updated = await repo.removeFeedsFromEvent(typedEventDoc.id - 1, feedIds[0])
      const fetched = await repo.findById(typedEventDoc.id)

      expect(typedEventDoc.feedIds).to.deep.equal(feedIds)
      expect(fetched?.feedIds).to.deep.equal(feedIds)
      expect(updated).to.be.null
    })
  })

  describe('removing a feed from all referencing events', function() {

    it('removes the feed id entry from all events that reference the feed', async function() {

      const feedId = uniqid()
      const eventDocs = await Promise.all([
        createEvent({
          name: 'Remove Feeds 1',
          description: 'testing',
          feedIds: [
            uniqid(),
            feedId,
            uniqid(),
          ]
        }),
        createEvent({
          name: 'Remove Feeds 2',
          description: 'testing',
          feedIds: [
            feedId
          ]
        }),
        createEvent({
          name: 'Remove Feeds 3',
          description: 'testing',
          feedIds: [
            uniqid(),
            uniqid()
          ]
        })
      ])
      const updateCount = await repo.removeFeedsFromEvents(feedId)
      const updatedEventDocs = await model.find({ _id: { $in: eventDocs.map(x => x._id) }})
      expect(updateCount).to.equal(2)
      expect(updatedEventDocs).to.have.length(3)
      const byId = _.keyBy(updatedEventDocs.map(x => x.toJSON() as MageEvent), 'id')
      expect(byId[eventDocs[0].id]).to.deep.include(
        {
          id: eventDocs[0]._id,
          name: 'Remove Feeds 1',
          description: 'testing',
          feedIds: [ eventDocs[0].feedIds[0], eventDocs[0].feedIds[2] ]
        }
      )
      expect(byId[eventDocs[1].id]).to.deep.include(
        {
          id: eventDocs[1]._id,
          name: 'Remove Feeds 2',
          description: 'testing',
          feedIds: []
        }
      )
      expect(byId[eventDocs[2].id]).to.deep.include(
        {
          id: eventDocs[2]._id,
          name: 'Remove Feeds 3',
          description: 'testing',
          feedIds: eventDocs[2].feedIds
        }
      )
    })

    it('removes multiple feeds from multiple events', async function() {

      const feedIds = [ uniqid(), uniqid() ]
      const created = await Promise.all([
        createEvent({
          name: 'Remove Feeds 1',
          description: 'testing',
          feedIds: [
            feedIds[0],
            uniqid(),
            feedIds[1]
          ]
        }),
        createEvent({
          name: 'Remove Feeds 2',
          description: 'testing',
          feedIds: [
            ...feedIds
          ]
        }),
        createEvent({
          name: 'Remove Feeds 3',
          description: 'testing',
          feedIds: [
            uniqid(),
            feedIds[1],
            uniqid()
          ]
        }),
        createEvent({
          name: 'Remove Feeds 4',
          description: 'testing',
          feedIds: [
            uniqid(),
            uniqid()
          ]
        })
      ]) as MageEventDocument[]
      // re-fetch to get teamIds array populated
      const idsFilter = { _id: { $in: created.map(x => x._id) }}
      const fetched = _.keyBy((await model.find(idsFilter)).map(x => x.toJSON() as MageEvent), 'name')
      expect(Object.keys(fetched)).to.have.length(4)

      const updateCount = await repo.removeFeedsFromEvents(...feedIds)
      expect(updateCount).to.equal(3)

      const updated = _.keyBy((await model.find(idsFilter)).map(x => x.toJSON() as MageEvent), 'name')
      for (const nameNum of [ 1, 2, 3, 4 ]) {
        const name = `Remove Feeds ${nameNum}`
        const createdEvent = fetched[name]
        const updatedEvent = updated[name]
        expect(createdEvent.feedIds, name).to.include.members(updatedEvent.feedIds)
        expect(_.difference(createdEvent.feedIds, feedIds), name).to.deep.equal(updatedEvent.feedIds)
        expect(_.omit(updatedEvent, 'feedIds')).to.deep.equal(_.omit(createdEvent, 'feedIds'))
      }
    })
  })

  describe('getting teams in an event', function() {

    it('gets the teams', async function() {

      const user = mongoose.Types.ObjectId().toHexString()
      const teams: Partial<Team>[] = [
        {
          id: mongoose.Types.ObjectId().toHexString(),
          name: 'Team 1',
          acl: {
            [user]: {
              role: 'OWNER',
              permissions: [ 'read', 'update', 'delete' ]
            }
          },
          userIds: [ user, mongoose.Types.ObjectId().toHexString(), mongoose.Types.ObjectId().toHexString() ]
        },
        {
          id: mongoose.Types.ObjectId().toHexString(),
          name: 'Team 2',
          acl: {
            [user]: {
              role: 'GUEST',
              permissions: [ 'read' ]
            }
          },
          userIds: [ user, mongoose.Types.ObjectId().toHexString() ]
        }
      ]
      const teamDocs = await Promise.all(teams.map(async (x) => {
        return await TeamModel.create(Object.assign({ ...x },
          {
            _id: mongoose.Types.ObjectId(x.id),
            acl: _.mapValues(x.acl, x => x.role)
          }))
      }))
      eventDoc.teamIds = teamDocs.map(x => x._id)
      eventDoc = await eventDoc.save()
      const fetchedTeams = await repo.findTeamsInEvent(eventDoc.id)

      expect(fetchedTeams).to.deep.equal(teams)
    })

    it('returns null when the event does not exist', async function() {
      const oops = await repo.findTeamsInEvent(eventDoc.id - 1)
      expect(oops).to.be.null
    })
  })

  it('does not allow creating events', async function() {
    await expect(repo.create()).to.eventually.rejectWith(Error)
  })

  it('does not allow updating events', async function() {
    await expect(repo.update({ id: eventDoc._id, feedIds: [ 'not_allowed' ] })).to.eventually.rejectWith(Error)
  })
})