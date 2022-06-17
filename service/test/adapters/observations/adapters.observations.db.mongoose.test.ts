import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import _ from 'lodash'
import { MongooseMageEventRepository } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseObservationRepository } from '../../../lib/adapters/observations/adapters.observations.db.mongoose'
import * as legacy from '../../../lib/models/observation'
import * as legacyEvent from '../../../lib/models/event'
import { MageEventDocument } from '../../../src/models/event'
import TeamModelModule = require('../../../lib/models/team')

import { MageEvent, MageEventAttrs, MageEventCreateAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { ObservationDocument, ObservationModel } from '../../../src/models/observation'
import { ObservationAttrs, ObservationId, Observation, ObservationRepositoryError, ObservationRepositoryErrorCode, copyObservationAttrs } from '../../../lib/entities/observations/entities.observations'
import { AttachmentPresentationType, FormFieldType, Form, AttachmentMediaTypes } from '../../../lib/entities/events/entities.events.forms'
import util from 'util'
import { PendingEntityId } from '../../../lib/entities/entities.global'

function observationStub(id: ObservationId, eventId: MageEventId): ObservationAttrs {
  const now = Date.now()
  const attrs: ObservationAttrs = {
    id,
    eventId,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ 0, 0 ] },
    createdAt: new Date(now),
    lastModified: new Date(now),
    properties: {
      timestamp: new Date(now),
      forms: []
    },
    states: [],
    favoriteUserIds: [],
    attachments: [],
  }
  return attrs
}

function omitUndefinedValues<T extends object>(x: T): T {
  return _.omitBy(x, (v, k) => v === undefined) as T
}

function omitKeysAndUndefinedValues<T extends object, K extends keyof T>(x: T, ...keys: K[]): Omit<T, K> {
  return omitUndefinedValues(_.omit(x, keys))
}

describe('mongoose observation repository', function() {

  let model: ObservationModel
  let repo: MongooseObservationRepository
  let eventDoc: MageEventDocument
  let event: MageEvent
  let createEvent: (attrs: MageEventCreateAttrs & Partial<MageEventAttrs>) => Promise<MageEventDocument>

  beforeEach('initialize model', async function() {

    const MageEventModel = legacyEvent.Model as mongoose.Model<MageEventDocument>
    const eventRepo = new MongooseMageEventRepository(MageEventModel)
    createEvent = (attrs: Partial<MageEventAttrs>): Promise<MageEventDocument> => {
      return new Promise<MageEventDocument>((resolve, reject) => {
        legacyEvent.create(
          attrs as MageEventCreateAttrs,
          { _id: mongoose.Types.ObjectId() },
          (err: any | null, event?: MageEventDocument) => {
            if (event) {
              return resolve(event)
            }
            reject(err)
          })
      })
      .then(createdWithoutTeamId => {
        // fetch again, because the create method does not return the event with
        // the implicitly created team id in the teamIds list, presumably
        // because it's done in middleware |:$
        // TODO: fix the above
        return MageEventModel.findById(createdWithoutTeamId._id).then(withTeamId => {
          if (withTeamId) {
            return withTeamId
          }
          throw new Error(`created event ${createdWithoutTeamId._id} now does not exist!`)
        })
      })
    }
    eventDoc = await createEvent({
      name: 'Test Event',
      description: 'For testing',
      maxObservationForms: 2,
    })
    const addForm = util.promisify(legacyEvent.addForm) as (eventId: MageEventId, form: Form) => Promise<MageEventDocument>
    eventDoc = await addForm(eventDoc._id, {
      id: 1,
      archived: false,
      name: 'Form 1',
      color: '#aa0000',
      fields: [
        {
          type: FormFieldType.Text,
          id: 1,
          name: 'field1',
          title: 'Field 1',
          required: true,
        },
        {
          type: FormFieldType.Numeric,
          id: 2,
          name: 'field2',
          title: 'Field 2',
          required: false,
          min: 10
        },
        {
          type: FormFieldType.Attachment,
          id: 3,
          name: 'field3',
          title: 'Field 3',
          required: false,
          allowedAttachmentTypes: [ AttachmentPresentationType.Image ]
        }
      ],
      userFields: []
    })
    model = legacy.observationModel(eventDoc)
    repo = new MongooseObservationRepository(eventDoc, eventRepo.findById.bind(eventRepo))
    event = new MageEvent(eventRepo.entityForDocument(eventDoc))

    expect(eventDoc._id).to.be.a('number')
    expect(eventDoc.teamIds.length).to.equal(1)
  })

  afterEach(async function() {
    // should run all the middleware to drop the observation collection
    await eventDoc.remove()
    await repo.idModel.remove({})
  })

  describe('allocating an observation id', function() {

    it('adds an observation id to the collection and returns it', async function() {

      const id = await repo.allocateObservationId()
      const parsed = mongoose.Types.ObjectId(id)
      const found = await repo.idModel.findById(id)
      const idCount = await repo.idModel.count({})

      expect(id).to.be.a.string
      expect(id).to.not.be.empty
      expect(parsed.equals(found?._id)).to.be.true
      expect(idCount).to.equal(1)
    })
  })

  describe('saving observations', function() {

    describe('new observations', function() {

      it('fails if the observation is new and the id is not in the id collection', async function() {

        const id = mongoose.Types.ObjectId()
        const stub = observationStub(id.toHexString(), event.id)
        const observation = Observation.evaluate(stub, event)
        const err = await repo.save(observation) as ObservationRepositoryError

        expect(observation.validation.hasErrors).to.be.false
        expect(err).to.be.instanceOf(ObservationRepositoryError)
        expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservationId)
        const count = await model.count({})
        expect(count).to.equal(0)
      })

      it('saves a minimal valid observation', async function() {

        const id = await repo.allocateObservationId()
        const attrs = observationStub(id, event.id)
        const observation = Observation.evaluate(attrs, event)
        const beforeSaveAttrs = copyObservationAttrs(observation)
        const saved = await repo.save(observation) as Observation
        const found = await repo.findById(id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.count({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(id)
        expect(saved.validation.hasErrors).to.be.false
        expect(_.omit(savedAttrs, 'states')).to.deep.equal(_.omit(beforeSaveAttrs, 'states'))
        expect(savedAttrs.states).to.have.length(1)
        expect(savedAttrs.states[0].id).to.be.a('string')
        expect(savedAttrs.states[0].name).to.equal('active')
        expect(foundAttrs).to.deep.equal(savedAttrs)
        expect(count).to.equal(1)
      })

      it('saves a complex valid observation', async function() {

        const id = await repo.allocateObservationId()
        const attrs = observationStub(id, event.id)
        const formEntryId = (await repo.nextFormEntryIds())[0]
        const attachmentId = (await repo.nextAttachmentIds())[0]
        attrs.properties.forms = [
          {
            id: formEntryId,
            formId: event.forms[0].id,
            field1: 'some text',
            field2: 10,
          }
        ]
        attrs.attachments = [
          {
            id: attachmentId,
            observationFormId: formEntryId,
            fieldName: 'field3',
            name: 'test.jpg',
            oriented: false,
            thumbnails: [
              {
                minDimension: 150,
                contentLocator: attachmentId + '@150',
                size: 1234,
                contentType: undefined,
                height: undefined,
                width: undefined,
                name: undefined,
              }
            ],
            contentType: AttachmentMediaTypes[AttachmentPresentationType.Image][0],
            lastModified: new Date(Date.now() - 1000 * 60 * 60),
            height: undefined,
            width: undefined,
            contentLocator: 'a1s2d3',
            size: 12345,
          }
        ]
        attrs.states = [
          {
            id: mongoose.Types.ObjectId().toHexString(),
            name: 'active',
            userId: mongoose.Types.ObjectId().toHexString()
          },
          {
            id: mongoose.Types.ObjectId().toHexString(),
            name: 'archived',
            userId: undefined
          }
        ]
        attrs.important = {
          timestamp: new Date(),
          description: 'look at me',
          userId: mongoose.Types.ObjectId().toHexString(),
        }
        const observation = Observation.evaluate(attrs, event)

        const saved = await repo.save(observation) as Observation
        const found = await repo.findById(id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.count({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(id)
        expect(omitUndefinedValues(savedAttrs)).to.deep.equal(attrs)
        expect(omitUndefinedValues(foundAttrs)).to.deep.equal(attrs)
        expect(count).to.equal(1)
      })
    })

    describe('updating observations', function() {

      let origAttrs: ObservationAttrs
      let origDoc: ObservationDocument
      let orig: Observation

      beforeEach(async function() {

        const id = await repo.allocateObservationId()
        const formEntryId = (await repo.nextFormEntryIds())[0]
        const attachmentId = (await repo.nextAttachmentIds())[0]
        origAttrs = observationStub(id, event.id)
        origAttrs.createdAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
        origAttrs.lastModified = new Date(origAttrs.createdAt.getTime() + 1000 * 60 * 60 * 5)
        origAttrs.properties.forms = [
          {
            id: formEntryId,
            formId: event.forms[0].id
          }
        ]
        origAttrs.states = [
          { id: mongoose.Types.ObjectId().toHexString(), name: 'active', userId: mongoose.Types.ObjectId().toHexString() }
        ]
        origAttrs.properties.forms = [
          {
            id: formEntryId,
            formId: event.forms[0].id,
            field1: 'original text'
          }
        ]
        origAttrs.attachments = [
          {
            id: attachmentId,
            fieldName: 'field3',
            observationFormId: formEntryId,
            oriented: true,
            thumbnails: [],
            name: 'original.png',
            contentType: 'image/png',
            lastModified: new Date()
          }
        ]
        orig = await repo.save(Observation.evaluate(origAttrs, event)) as Observation
        origDoc = await model.findById(id) as ObservationDocument
      })

      it('uses put/replace semantics to save the observation as the attributes specify', async function() {

        const putAttrs = copyObservationAttrs(origAttrs)
        putAttrs.geometry = {
          type: 'Point',
          coordinates: [ 12, 34 ]
        }
        putAttrs.states = [
          { name: 'archived', id: PendingEntityId }
        ]
        putAttrs.properties.forms = [
          {
            id: orig.properties.forms[0].id,
            formId: event.forms[0].id,
            field1: 'mod text',
            field2: 20
          }
        ]
        putAttrs.attachments = []
        const put = Observation.evaluate(putAttrs, event)
        const saved = await repo.save(put) as Observation
        const found = await repo.findById(orig.id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.count({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(orig.id)
        expect(omitKeysAndUndefinedValues(savedAttrs, 'lastModified', 'states')).to.deep.equal(omitKeysAndUndefinedValues(putAttrs, 'lastModified', 'states'))
        expect(omitKeysAndUndefinedValues(foundAttrs, 'lastModified', 'states')).to.deep.equal(omitKeysAndUndefinedValues(putAttrs, 'lastModified', 'states'))
        expect(savedAttrs.states[0].id).to.be.a('string')
        expect(savedAttrs.states[0].name).to.equal('archived')
        expect(savedAttrs.states[0].userId).to.be.undefined
        expect(() => mongoose.Types.ObjectId(savedAttrs.states[0].id as string)).not.to.throw()
        expect(savedAttrs.states[0].id).not.to.equal(orig.states[0].id)
        expect(savedAttrs.lastModified.getTime()).to.be.greaterThanOrEqual(orig.lastModified.getTime())
        expect(count).to.equal(1)
      })

      it('does not allow changing the create timestamp', async function() {

        const modAttrs = copyObservationAttrs(orig)
        const createdTime = modAttrs.createdAt.getTime()
        modAttrs.createdAt = new Date()
        const mod = Observation.evaluate(modAttrs, event)
        const saved = await repo.save(mod) as Observation
        const foundDoc = await model.findById(orig.id) as ObservationDocument

        expect(saved.createdAt.getTime()).to.equal(createdTime)
        expect(foundDoc.createdAt.getTime()).to.equal(createdTime)
      })
    })

    it('fails if the id is invalid', async function() {

      const stub = observationStub('not an objectid', event.id)
      const observation = Observation.evaluate(stub, event)
      const err = await repo.save(observation) as ObservationRepositoryError

      expect(observation.validation.hasErrors).to.be.false
      expect(err).to.be.instanceOf(ObservationRepositoryError)
      expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservationId)
      const count = await model.count({})
      expect(count).to.equal(0)
    })

    it('fails if the observation is invalid', async function() {

      const id = await repo.allocateObservationId()
      const stub = observationStub(id, event.id)
      const formEntryId = (await repo.nextFormEntryIds())[0]
      stub.properties.forms = [
        {
          id: formEntryId,
          formId: event.forms[0].id,
        }
      ]
      const observation = Observation.evaluate(stub, event)
      const err = await repo.save(observation) as ObservationRepositoryError

      expect(observation.validation.hasErrors).to.be.true
      expect(err).to.be.instanceOf(ObservationRepositoryError)
      expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservation)
      const count = await model.count({})
      expect(count).to.equal(0)
    })

    it('assigns new ids to new states', async function() {

      const id = await repo.allocateObservationId()
      const state1Stub = observationStub(id, event.id)
      state1Stub.states = [
        {
          id: PendingEntityId,
          name: 'archived',
          userId: mongoose.Types.ObjectId().toHexString()
        }
      ]
      const state1 = Observation.evaluate(state1Stub, event)
      const state1Saved = await repo.save(state1) as Observation
      const state1Found = await repo.findById(id) as Observation
      const state2Stub = copyObservationAttrs(state1Saved)
      state2Stub.states = [
        {
          id: PendingEntityId,
          name: 'active',
          userId: mongoose.Types.ObjectId().toHexString()
        },
        state1Saved.states[0],
      ]
      const state2 = Observation.evaluate(state2Stub, event)
      const state2Saved = await repo.save(state2) as Observation
      const state2Found = await repo.findById(id) as Observation

      expect(state1Saved.states).to.have.length(1)
      expect(state1Saved.states[0]).to.deep.include({
        name: 'archived',
        userId: state1Stub.states[0].userId
      })
      expect(() => mongoose.Types.ObjectId(state1Saved.states[0].id as string).toHexString()).not.to.throw()
      expect(copyObservationAttrs(state1Found)).to.deep.equal(copyObservationAttrs(state1Saved))
      expect(state2Saved.states).to.have.length(2)
      expect(state2Saved.states[0]).to.deep.include({
        name: 'active',
        userId: state2Stub.states[0].userId
      })
      expect(() => mongoose.Types.ObjectId(state2Saved.states[0].id as string).toHexString()).not.to.throw()
      expect(copyObservationAttrs(state2Found)).to.deep.equal(copyObservationAttrs(state2Saved))
      expect(state2Saved.states[1]).to.deep.equal(state1Saved.states[0])
      expect(state2Saved.states[0].id).not.to.equal(state2Saved.states[1].id)
    })

    it('retains ids for existing entities')
  })
})