import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import _ from 'lodash'
import { MongooseMageEventRepository } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseObservationRepository } from '../../../lib/adapters/observations/adapters.observations.db.mongoose'
import * as legacy from '../../../lib/models/observation'
import * as legacyEvent from '../../../lib/models/event'
import { MageEventDocument } from '../../../src/models/event'

import { MageEvent, MageEventAttrs, MageEventCreateAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { ObservationDocument, ObservationModel } from '../../../src/models/observation'
import { ObservationAttrs, ObservationId, Observation, ObservationRepositoryError, ObservationRepositoryErrorCode, copyObservationAttrs, AttachmentContentPatchAttrs, copyAttachmentAttrs, AttachmentNotFoundError, AttachmentPatchAttrs, removeAttachment, validationResultMessage, ObservationDomainEventType, ObservationEmitted, PendingObservationDomainEvent, AttachmentsRemovedDomainEvent } from '../../../lib/entities/observations/entities.observations'
import { AttachmentPresentationType, FormFieldType, Form, AttachmentMediaTypes } from '../../../lib/entities/events/entities.events.forms'
import util from 'util'
import { PendingEntityId } from '../../../lib/entities/entities.global'
import uniqid from 'uniqid'
import EventEmitter from 'events'
import Substitute, { Arg, SubstituteOf } from '@fluffy-spoon/substitute'

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
  let domainEvents: SubstituteOf<EventEmitter>

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
    domainEvents = Substitute.for<EventEmitter>()
    model = legacy.observationModel(eventDoc)
    repo = new MongooseObservationRepository(eventDoc, eventRepo.findById.bind(eventRepo), domainEvents)
    event = new MageEvent(eventRepo.entityForDocument(eventDoc))

    expect(eventDoc._id).to.be.a('number')
    expect(eventDoc.teamIds.length).to.equal(1)
  })

  afterEach(async function() {
    await model.ensureIndexes()
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

  describe('updating individual attachments', function() {

    let obs: Observation

    beforeEach(async function() {
      const id = await repo.allocateObservationId()
      const formEntryId = (await repo.nextFormEntryIds())[0]
      const attrs = observationStub(id, event.id)
      const attachmentIds = await repo.nextAttachmentIds(3)
      attrs.properties.forms = [
        { id: formEntryId, formId: event.forms[0].id, field1: 'makes it valid' }
      ]
      attrs.attachments = [
        {
          id: attachmentIds[0],
          observationFormId: formEntryId,
          fieldName: 'field3',
          oriented: false,
          name: 'photo1.jpg',
          contentType: 'image/jpeg',
          size: 1234,
          thumbnails: []
        },
        {
          id: attachmentIds[1],
          observationFormId: formEntryId,
          fieldName: 'field3',
          oriented: false,
          name: 'photo2.jpg',
          contentType: 'image/jpeg',
          size: 1345,
          thumbnails: []
        },
        {
          id: attachmentIds[2],
          observationFormId: formEntryId,
          fieldName: 'field3',
          oriented: false,
          name: 'photo3.jpg',
          contentType: 'image/jpeg',
          size: 1456,
          thumbnails: []
        },
      ]
      obs = Observation.evaluate(attrs, event)
      obs = await repo.save(obs) as Observation

      expect(obs).to.be.instanceOf(Observation)
      expect(obs.validation.hasErrors).to.be.false
    })

    it('saves the content meta-data for the given attachment id', async function() {

      const contentInfo: AttachmentContentPatchAttrs = {
        size: 674523,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`
      }
      const updated = await repo.patchAttachment(obs, obs.attachments[0].id, contentInfo) as Observation
      const fetched = await repo.findById(obs.id) as Observation

      expect(updated).to.be.instanceOf(Observation)
      expect(_.omit(updated.attachments[0], 'lastModified')).to.deep.equal(_.omit({
        ...copyAttachmentAttrs(obs.attachments[0]),
        ...contentInfo
      }, 'lastModified'))
      expect(copyObservationAttrs(fetched)).to.deep.equal(copyObservationAttrs(updated))
    })

    it('updates all attributes', async function() {

      const patch: Required<AttachmentPatchAttrs> = {
        size: 674523,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`,
        contentType: 'image/png',
        width: 450,
        height: 800,
        name: 'patched.png',
        oriented: true,
        thumbnails: [{ minDimension: 80, contentLocator: uniqid(), contentType: 'image/jpeg' }]
      }
      const updated = await repo.patchAttachment(obs, obs.attachments[0].id, patch) as Observation
      const fetched = await repo.findById(obs.id) as Observation

      expect(updated).to.be.instanceOf(Observation)
      expect(_.omit(updated.attachments[0], 'lastModified')).to.deep.equal(_.omit(copyAttachmentAttrs({
        ...copyAttachmentAttrs(obs.attachments[0]),
        ...patch
      }), 'lastModified'))
      expect(copyObservationAttrs(fetched)).to.deep.equal(copyObservationAttrs(updated))
    })

    it('unsets keys with undefined values', async function() {

      const patch: AttachmentPatchAttrs = {
        size: undefined,
        name: undefined,
        contentType: undefined,
      }
      const updated = await repo.patchAttachment(obs, obs.attachments[0].id, patch) as Observation
      const fetched = await repo.findById(obs.id) as Observation

      expect(updated).to.be.instanceOf(Observation)
      expect(updated.attachments[0]).to.not.have.keys('size', 'name', 'contentType')
      expect(_.omit(updated.attachments[0], 'lastModified')).to.deep.equal(_.omit({
        ...copyAttachmentAttrs(obs.attachments[0]),
        ...patch
      }, 'lastModified'))
      expect(copyObservationAttrs(fetched)).to.deep.equal(copyObservationAttrs(updated))
    })

    it('does not overwrite changes of concurrent update', async function() {

      const contentInfo1: AttachmentContentPatchAttrs = {
        size: 111111,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`
      }
      const contentInfo2: AttachmentContentPatchAttrs = {
        size: 222222,
        contentLocator: `${obs.id}:${obs.attachments[1].id}`
      }
      const contentInfo3: AttachmentContentPatchAttrs = {
        size: 333333,
        contentLocator: `${obs.id}:${obs.attachments[2].id}`
      }
      await Promise.all([
        repo.patchAttachment(obs, obs.attachments[0].id, contentInfo1),
        repo.patchAttachment(obs, obs.attachments[1].id, contentInfo2),
        repo.patchAttachment(obs, obs.attachments[2].id, contentInfo3),
      ])
      const fetched = await repo.findById(obs.id) as Observation

      expect(fetched).to.be.instanceOf(Observation)
      expect(fetched.attachments[0]).to.deep.include(contentInfo1)
      expect(fetched.attachments[1]).to.deep.include(contentInfo2)
      expect(fetched.attachments[2]).to.deep.include(contentInfo3)
    })

    it('returns null if the observation does not exist', async function() {

      const contentInfo: AttachmentContentPatchAttrs = {
        size: 111111,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`
      }
      const unsavedId = await repo.allocateObservationId()
      const phantom = Observation.evaluate({
        ...copyObservationAttrs(obs),
        id: unsavedId
      }, obs.mageEvent)
      const updated = await repo.patchAttachment(phantom, phantom.attachments[0].id, contentInfo)
      const fetched = await repo.findById(unsavedId)
      const all = await repo.findAll()

      expect(updated).to.be.null
      expect(fetched).to.be.null
      expect(all).to.have.length(1)
      expect(copyObservationAttrs(all[0])).to.deep.equal(copyObservationAttrs(obs))
    })

    it('returns an error if the attachment id does not exist on the observation', async function() {

      const contentInfo: AttachmentContentPatchAttrs = {
        size: 111111,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`
      }
      const updated = await repo.patchAttachment(obs, mongoose.Types.ObjectId().toHexString(), contentInfo)
      const fetched = await repo.findById(obs.id)

      expect(updated).to.be.instanceOf(AttachmentNotFoundError)
      expect(copyObservationAttrs(fetched as Observation)).to.deep.equal(copyObservationAttrs(obs))
    })
  })

  describe('dispatching domain events', function() {

    let obs: Observation

    beforeEach(async function() {
      const id = await repo.allocateObservationId()
      const formId = await repo.nextFormEntryIds().then(x => x[0])
      const attachmentIds = await repo.nextAttachmentIds(3)
      const beforeAttrs = observationStub(id, event.id)
      beforeAttrs.properties.forms = [
        {
          id: formId,
          formId: event.forms[0].id,
          field1: 'make valid'
        }
      ]
      beforeAttrs.attachments = [
        {
          id: attachmentIds.pop()!,
          observationFormId: formId,
          fieldName: 'field3',
          contentType: 'image/jpeg',
          oriented: false,
          thumbnails: [],
        },
        {
          id: attachmentIds.pop()!,
          observationFormId: formId,
          fieldName: 'field3',
          contentType: 'image/jpeg',
          oriented: false,
          thumbnails: [],
        },
        {
          id: attachmentIds.pop()!,
          observationFormId: formId,
          fieldName: 'field3',
          contentType: 'image/jpeg',
          oriented: false,
          thumbnails: [],
        },
      ]
      obs = Observation.evaluate(beforeAttrs, event)

      expect(obs.validation.hasErrors, validationResultMessage(obs.validation)).to.be.false

      obs = await repo.save(obs) as Observation
    })

    it('dispatches pending events on the observation after the observation saves', async function() {

      /*
      TODO: should there a mechanism to ensure domain events cannot be
      dispatched more than once after an observation has been saved?
      Observation instances are immutable so the instance given to the save
      method could be saved again, which would dispatch events again.  not
      sure how functionally-programmed systems handle that.
      */

      const mod = removeAttachment(obs, obs.attachments[1].id) as Observation
      const saved = await repo.save(mod) as Observation

      expect(mod.pendingEvents).to.have.length(1)
      expect(saved.pendingEvents).to.deep.equal([])
      domainEvents.received(1).emit(Arg.all())
      domainEvents.received(1).emit(
        mod.pendingEvents[0].type,
        Arg.deepEquals({ ...mod.pendingEvents[0], observation: saved })
      )
    })

    it('emits readonly events', async function() {

      const mod = removeAttachment(obs, obs.attachments[1].id) as Observation
      const receivedEvents = [] as ObservationEmitted<PendingObservationDomainEvent>[]
      const realDomainEvents = new EventEmitter()
      domainEvents.on(Arg.all()).mimicks(realDomainEvents.on.bind(realDomainEvents))
      domainEvents.emit(Arg.all()).mimicks(realDomainEvents.emit.bind(realDomainEvents))
      domainEvents.on(ObservationDomainEventType.AttachmentsRemoved, e => {
        receivedEvents.push(e)
      })
      const saved = await repo.save(mod) as Observation

      expect(saved.pendingEvents).to.be.empty
      expect(receivedEvents.length).to.equal(1)
      const receivedEvent = receivedEvents[0] as ObservationEmitted<AttachmentsRemovedDomainEvent>
      const removedAttachments = receivedEvent.removedAttachments
      const receivedEventUntyped = receivedEvent as any
      expect(() => {
        receivedEventUntyped.type = 'wut'
        receivedEventUntyped.observation = mod
        receivedEventUntyped.removedAttachments = []
      }).to.throw
      expect(receivedEvent.type).to.equal(ObservationDomainEventType.AttachmentsRemoved)
      expect(receivedEvent.observation).to.equal(saved)
      expect(removedAttachments.length).to.equal(1)
      expect(receivedEvent.removedAttachments).to.equal(removedAttachments)
    })

    it('does not dispatch events if the observation is invalid', async function() {

      const mod = Observation.assignTo(obs, {
        ...copyObservationAttrs(obs),
        attachments: [
          {
            ...obs.attachments[0],
            fieldName: 'wut'
          }
        ]
      }) as Observation
      const saved = await repo.save(mod)

      expect(mod.validation.hasErrors).to.be.true
      expect(mod.pendingEvents.length).to.be.greaterThan(0)
      expect(saved).to.be.instanceOf(ObservationRepositoryError)
      domainEvents.didNotReceive().emit(Arg.all())
    })

    it('does not dispatch events if there was a database saving the observation', async function() {

      let mod = Observation.evaluate({
        ...copyObservationAttrs(obs),
        id: mongoose.Types.ObjectId().toHexString()
      }, event)
      mod = removeAttachment(mod, mod.attachments[0].id) as Observation
      const saved = await repo.save(mod)

      expect(mod.validation.hasErrors).to.be.false
      expect(mod.pendingEvents.length).to.be.greaterThan(0)
      expect(saved).to.be.instanceOf(ObservationRepositoryError)
      domainEvents.didNotReceive().emit(Arg.all())
    })
  })
})