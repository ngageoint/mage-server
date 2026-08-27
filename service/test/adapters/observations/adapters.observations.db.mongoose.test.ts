import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import _ from 'lodash'
import { MongooseMageEventRepository } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseObservationRepository } from '../../../lib/adapters/observations/adapters.observations.db.mongoose'
import * as legacy from '../../../lib/models/observation'
import * as legacyEvent from '../../../lib/models/event'
import { MageEventDocument, MageEventModelInstance } from '../../../src/models/event'

import { MageEvent, MageEventAttrs, MageEventCreateAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { ObservationDocument, ObservationModel } from '../../../src/models/observation'
import { ObservationAttrs, ObservationId, Observation, ObservationRepositoryError, ObservationRepositoryErrorCode, copyObservationAttrs, AttachmentContentPatchAttrs, copyAttachmentAttrs, AttachmentNotFoundError, AttachmentPatchAttrs, AttachmentProcessingStatus, removeAttachment, validationResultMessage, ObservationDomainEventType, ObservationEmitted, PendingObservationDomainEvent, AttachmentsRemovedDomainEvent, UsersExpandedObservationAttrs } from '../../../lib/entities/observations/entities.observations'
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
    geometry: { type: 'Point', coordinates: [0, 0] },
    createdAt: new Date(now),
    lastModified: new Date(now),
    noGeometry: false,
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
  if (Array.isArray(x)) {
    return x.map(v => isPlainRecursable(v) ? omitUndefinedValues(v) : v) as T
  }
  const omitted = _.omitBy(x, (v, k) => v === undefined) as T
  for (const key of Object.keys(omitted) as (keyof T)[]) {
    const value = omitted[key]
    if (isPlainRecursable(value)) {
      omitted[key] = omitUndefinedValues(value) as T[keyof T]
    }
  }
  return omitted
}

function isPlainRecursable(v: unknown): v is object {
  return !!v && typeof v === 'object' && (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype)
}

function omitKeysAndUndefinedValues<T extends object, K extends keyof T>(x: T, ...keys: K[]): Omit<T, K> {
  return omitUndefinedValues(_.omit(x, keys))
}

describe('mongoose observation repository', function () {

  let model: ObservationModel
  let repo: MongooseObservationRepository
  let eventDoc: MageEventModelInstance
  let event: MageEvent
  let createEvent: (attrs: MageEventCreateAttrs & Partial<MageEventAttrs>) => Promise<MageEventModelInstance>
  let domainEvents: SubstituteOf<EventEmitter>

  beforeEach('initialize model', async function () {
    //TODO remove cast to any, was mongoose.Model<MageEventDocument>
    const MageEventModel = legacyEvent.Model as any
    const eventRepo = new MongooseMageEventRepository(MageEventModel)
    createEvent = (attrs: Partial<MageEventAttrs>): Promise<MageEventModelInstance> => {
      return new Promise<MageEventDocument>((resolve, reject) => {
        legacyEvent.create(
          attrs as MageEventCreateAttrs,
          { _id: new mongoose.Types.ObjectId() },
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
          return MageEventModel.findById(createdWithoutTeamId._id).then((withTeamId: any) => {
            if (withTeamId) {
              return withTeamId
            }
            throw new Error(`created event ${createdWithoutTeamId._id} now does not exist!`)
          })
        })
    }
    // Use unique event name to avoid team name conflicts
    const uniqueId = new mongoose.Types.ObjectId().toHexString()
    eventDoc = await createEvent({
      name: `Test Event ${uniqueId}`,
      description: 'For testing',
      maxObservationForms: 2,
    })
    const addForm = util.promisify(legacyEvent.addForm) as (eventId: MageEventId, form: Form) => Promise<MageEventModelInstance>
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
          allowedAttachmentTypes: [AttachmentPresentationType.Image]
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

  afterEach(async function () {
    try {
      if (model) {
        await model.ensureIndexes()
      }
    } catch (err) {
      //don't care
    }
    // should run all the middleware to drop the observation collection
    if (eventDoc) {
      await eventDoc.deleteOne()
    }
    if (repo && repo.idModel) {
      await repo.idModel.deleteMany({})
    }
  })

  describe('allocating an observation id', function () {

    it('adds an observation id to the collection and returns it', async function () {

      const id = await repo.allocateObservationId()
      const parsed = new mongoose.Types.ObjectId(id)
      const found = await repo.idModel.findById(id)
      const idCount = await repo.idModel.countDocuments({})

      expect(id).to.be.a.string
      expect(id).to.not.be.empty
      expect(parsed.equals(found?._id)).to.be.true
      expect(idCount).to.equal(1)
    })
  })

  describe('saving observations', function () {

    describe('new observations', function () {

      it('fails if the observation is new and the id is not in the id collection', async function () {

        const id = new mongoose.Types.ObjectId()
        const stub = observationStub(id.toHexString(), event.id)
        const observation = Observation.evaluate(stub, event)
        const err = await repo.save(observation) as ObservationRepositoryError

        expect(observation.validation.hasErrors).to.be.false
        expect(err).to.be.instanceOf(ObservationRepositoryError)
        expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservationId)
        const count = await model.countDocuments({})
        expect(count).to.equal(0)
      })

      it('saves a minimal valid observation', async function () {

        const id = await repo.allocateObservationId()
        const attrs = observationStub(id, event.id)
        const observation = Observation.evaluate(attrs, event)
        const beforeSaveAttrs = copyObservationAttrs(observation)
        const saved = await repo.save(observation) as Observation
        const found = await repo.findById(id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.countDocuments({})

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

      it('saves a complex valid observation', async function () {

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
            processingRetryCount: 0,
          }
        ]
        attrs.states = [
          {
            id: (new mongoose.Types.ObjectId()).toHexString(),
            name: 'active',
            userId: (new mongoose.Types.ObjectId()).toHexString()
          },
          {
            id: (new mongoose.Types.ObjectId()).toHexString(),
            name: 'archived',
            userId: undefined
          }
        ]
        attrs.important = {
          timestamp: new Date(),
          description: 'look at me',
          userId: (new mongoose.Types.ObjectId()).toHexString(),
        }
        const observation = Observation.evaluate(attrs, event)

        const saved = await repo.save(observation) as Observation
        const found = await repo.findById(id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.countDocuments({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(id)
        expect(omitUndefinedValues(savedAttrs)).to.deep.equal(omitUndefinedValues(attrs))
        expect(omitUndefinedValues(foundAttrs)).to.deep.equal(omitUndefinedValues(attrs))
        expect(count).to.equal(1)
      })
    })

    describe('updating observations', function () {

      let origAttrs: ObservationAttrs
      let origDoc: ObservationDocument
      let orig: Observation

      beforeEach(async function () {

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
          { id: (new mongoose.Types.ObjectId()).toHexString(), name: 'active', userId: (new mongoose.Types.ObjectId()).toHexString() }
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

      it('uses put/replace semantics to save the observation as the attributes specify', async function () {

        const putAttrs = copyObservationAttrs(origAttrs)
        putAttrs.geometry = {
          type: 'Point',
          coordinates: [12, 34]
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
        const count = await model.countDocuments({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(orig.id)
        expect(omitKeysAndUndefinedValues(savedAttrs, 'lastModified', 'states')).to.deep.equal(omitKeysAndUndefinedValues(putAttrs, 'lastModified', 'states'))
        expect(omitKeysAndUndefinedValues(foundAttrs, 'lastModified', 'states')).to.deep.equal(omitKeysAndUndefinedValues(putAttrs, 'lastModified', 'states'))
        expect(savedAttrs.states[0].id).to.be.a('string')
        expect(savedAttrs.states[0].name).to.equal('archived')
        expect(savedAttrs.states[0].userId).to.be.undefined
        expect(() => new mongoose.Types.ObjectId(savedAttrs.states[0].id as string)).not.to.throw()
        expect(savedAttrs.states[0].id).not.to.equal(orig.states[0].id)
        expect(savedAttrs.lastModified.getTime()).to.be.greaterThanOrEqual(orig.lastModified.getTime())
        expect(count).to.equal(1)
      })

      it('removes previously set important', async function() {

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
        putAttrs.important = null
        const put = Observation.evaluate(putAttrs, event)
        const saved = await repo.save(put) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const count = await model.countDocuments()

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(orig.id)
        expect(() => new mongoose.Types.ObjectId(savedAttrs.states[0].id as string)).not.to.throw()
        expect(savedAttrs.states[0].id).not.to.equal(orig.states[0].id)
        expect(savedAttrs.lastModified.getTime()).to.be.greaterThanOrEqual(orig.lastModified.getTime())
        expect(count).to.equal(1)
        expect(saved.important).to.be.undefined
      })

      it('does not allow changing the create timestamp', async function () {

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

    it('fails if the id is invalid', async function () {

      const stub = observationStub('not an objectid', event.id)
      const observation = Observation.evaluate(stub, event)
      const err = await repo.save(observation) as ObservationRepositoryError

      expect(observation.validation.hasErrors).to.be.false
      expect(err).to.be.instanceOf(ObservationRepositoryError)
      expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservationId)
      const count = await model.countDocuments({})
      expect(count).to.equal(0)
    })

    it('fails if the observation is invalid', async function () {

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
      const count = await model.countDocuments({})
      expect(count).to.equal(0)
    })

    it('assigns new ids to new states', async function () {

      const id = await repo.allocateObservationId()
      const state1Stub = observationStub(id, event.id)
      state1Stub.states = [
        {
          id: PendingEntityId,
          name: 'archived',
          userId: (new mongoose.Types.ObjectId()).toHexString()
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
          userId: (new mongoose.Types.ObjectId()).toHexString()
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
      expect(() => new mongoose.Types.ObjectId(state1Saved.states[0].id as string).toHexString()).not.to.throw()
      expect(copyObservationAttrs(state1Found)).to.deep.equal(copyObservationAttrs(state1Saved))
      expect(state2Saved.states).to.have.length(2)
      expect(state2Saved.states[0]).to.deep.include({
        name: 'active',
        userId: state2Stub.states[0].userId
      })
      expect(() => new mongoose.Types.ObjectId(state2Saved.states[0].id as string).toHexString()).not.to.throw()
      expect(copyObservationAttrs(state2Found)).to.deep.equal(copyObservationAttrs(state2Saved))
      expect(state2Saved.states[1]).to.deep.equal(state1Saved.states[0])
      expect(state2Saved.states[0].id).not.to.equal(state2Saved.states[1].id)
    })

    it('retains ids for existing entities')
  })

  describe('updating individual attachments', function () {

    let obs: Observation

    beforeEach(async function () {
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
      obs = await repo.findById(obs.id) as Observation

      expect(obs).to.be.instanceOf(Observation)
      expect(obs.validation.hasErrors).to.be.false
    })

    it('saves the content meta-data for the given attachment id', async function () {

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

    it('updates all attributes', async function () {

      const patch: Required<AttachmentPatchAttrs> = {
        size: 674523,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`,
        contentType: 'image/png',
        width: 450,
        height: 800,
        name: 'patched.png',
        oriented: true,
        thumbnails: [{ minDimension: 80, contentLocator: uniqid(), contentType: 'image/jpeg' }],
        processingStatus: AttachmentProcessingStatus.Success,
        processingMessage: '',
        processingHook: '',
        stagedContentId: '',
        processingRetryCount: 0
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

    it('unsets keys with undefined values', async function () {

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

    it('does not overwrite changes of concurrent update', async function () {

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

    it('returns null if the observation does not exist', async function () {

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

    it('returns an error if the attachment id does not exist on the observation', async function () {

      const contentInfo: AttachmentContentPatchAttrs = {
        size: 111111,
        contentLocator: `${obs.id}:${obs.attachments[0].id}`
      }
      const updated = await repo.patchAttachment(obs, (new mongoose.Types.ObjectId()).toHexString(), contentInfo)
      const fetched = await repo.findById(obs.id)

      expect(updated).to.be.instanceOf(AttachmentNotFoundError)
      expect(copyObservationAttrs(fetched as Observation)).to.deep.equal(copyObservationAttrs(obs))
    })
  })

  describe('dispatching domain events', function () {

    let obs: Observation

    beforeEach(async function () {
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

    it('dispatches pending events on the observation after the observation saves', async function () {

      /*
      TODO: should there a mechanism to ensure domain events cannot be
      dispatched more than once after an observation has been saved?
      Observation instances are immutable so the instance given to the save
      method could be saved again, which would dispatch events again.  not
      sure how functionally-programmed systems handle that.
      */

      const mod = removeAttachment(obs, obs.attachments[1].id) as Observation
      const saved = await repo.save(mod) as Observation

      expect(mod.pendingEvents).to.have.length(2)
      expect(saved.pendingEvents).to.deep.equal([])
      domainEvents.received(2).emit(Arg.all())
      for (const pending of mod.pendingEvents) {
        domainEvents.received(1).emit(
          pending.type,
          Arg.deepEquals({ ...pending, observation: saved })
        )
      }
    })

    it('emits readonly events', async function () {

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

    it('does not dispatch events if the observation is invalid', async function () {

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

    it('does not dispatch events if there was a database saving the observation', async function () {

      let mod = Observation.evaluate({
        ...copyObservationAttrs(obs),
        id: (new mongoose.Types.ObjectId()).toHexString()
      }, event)
      mod = removeAttachment(mod, mod.attachments[0].id) as Observation
      const saved = await repo.save(mod)

      expect(mod.validation.hasErrors).to.be.false
      expect(mod.pendingEvents.length).to.be.greaterThan(0)
      expect(saved).to.be.instanceOf(ObservationRepositoryError)
      domainEvents.didNotReceive().emit(Arg.all())
    })
  })

  describe('finding observations', function () {

    let UserModel: mongoose.Model<any>
    let userA: { _id: mongoose.Types.ObjectId, displayName: string }
    let userB: { _id: mongoose.Types.ObjectId, displayName: string }
    let obsA: Observation
    let obsB: Observation
    let obsC: Observation
    let beforeObsCSaved: Date

    before(function () {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      UserModel = require('../../../lib/models/user').Model
    })

    beforeEach(async function () {
      userA = await UserModel.create({
        username: `finding-observations-a-${uniqid()}`,
        displayName: 'User A',
        active: true,
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId()
      })
      userB = await UserModel.create({
        username: `finding-observations-b-${uniqid()}`,
        displayName: 'User B',
        active: true,
        roleId: new mongoose.Types.ObjectId(),
        authenticationId: new mongoose.Types.ObjectId()
      })

      const idA = await repo.allocateObservationId()
      const attrsA = observationStub(idA, event.id)
      attrsA.userId = userA._id.toHexString()
      attrsA.geometry = { type: 'Point', coordinates: [ 10, 10 ] }
      attrsA.properties.timestamp = new Date(2020, 0, 1)
      attrsA.favoriteUserIds = [ userA._id.toHexString() ]
      attrsA.attachments = []
      obsA = await repo.save(Observation.evaluate(attrsA, event)) as Observation

      const idB = await repo.allocateObservationId()
      const attrsB = observationStub(idB, event.id)
      attrsB.userId = userB._id.toHexString()
      attrsB.geometry = { type: 'Point', coordinates: [ 20, 20 ] }
      attrsB.properties.timestamp = new Date(2020, 5, 1)
      attrsB.important = { userId: userB._id.toHexString(), timestamp: new Date(2020, 5, 1), description: 'important' }
      obsB = await repo.save(Observation.evaluate(attrsB, event)) as Observation
      const attachmentId = (await repo.nextAttachmentIds())[0]
      const formEntryId = (await repo.nextFormEntryIds())[0]
      const obsBWithAttachment = Observation.evaluate({
        ...copyObservationAttrs(obsB),
        properties: {
          ...obsB.properties,
          forms: [ { id: formEntryId, formId: event.forms[0].id, field1: 'x' } ]
        },
        attachments: [
          {
            id: attachmentId,
            observationFormId: formEntryId,
            fieldName: 'field3',
            oriented: false,
            name: 'photo.jpg',
            contentType: 'image/jpeg',
            thumbnails: []
          }
        ]
      }, event)
      obsB = await repo.save(obsBWithAttachment) as Observation

      await new Promise(resolve => setTimeout(resolve, 5))
      beforeObsCSaved = new Date()

      const idC = await repo.allocateObservationId()
      const attrsC = observationStub(idC, event.id)
      attrsC.geometry = { type: 'Point', coordinates: [ 30, 30 ] }
      attrsC.properties.timestamp = new Date(2020, 11, 1)
      attrsC.states = [ { id: (new mongoose.Types.ObjectId()).toHexString(), name: 'archived' } ]
      obsC = await repo.save(Observation.evaluate(attrsC, event)) as Observation
    })

    afterEach(async function () {
      await UserModel.deleteMany({ _id: { $in: [ userA._id, userB._id ] } })
    })

    describe('iterate', function () {

      async function collect(spec: Parameters<typeof repo.iterate>[0]): Promise<ObservationAttrs[]> {
        const results: ObservationAttrs[] = []
        for await (const obs of repo.iterate(spec)) {
          results.push(obs)
        }
        return results
      }

      it('returns all observations when no filter is given', async function () {

        const results = await collect({})

        expect(results.map(x => x.id).sort()).to.deep.equal([ obsA.id, obsB.id, obsC.id ].sort())
      })

      it('filters by timestampAfter and timestampBefore', async function () {

        const results = await collect({
          where: { timestampAfter: new Date(2020, 2, 1), timestampBefore: new Date(2020, 8, 1) }
        })

        expect(results.map(x => x.id)).to.deep.equal([ obsB.id ])
      })

      it('filters by lastModifiedAfter and lastModifiedBefore', async function () {

        const results = await collect({
          where: { lastModifiedAfter: beforeObsCSaved }
        })

        expect(results.map(x => x.id)).to.deep.equal([ obsC.id ])
      })

      it('filters by stateIsAnyOf', async function () {

        const results = await collect({ where: { stateIsAnyOf: [ 'archived' ] } })

        expect(results.map(x => x.id)).to.deep.equal([ obsC.id ])
      })

      it('filters by userIsAnyOf', async function () {

        const results = await collect({ where: { userIsAnyOf: [ userA._id.toHexString() ] } })

        expect(results.map(x => x.id)).to.deep.equal([ obsA.id ])
      })

      it('filters by ids', async function () {

        const results = await collect({ where: { ids: [ obsA.id, obsC.id ] } })

        expect(results.map(x => x.id).sort()).to.deep.equal([ obsA.id, obsC.id ].sort())
      })

      it('filters by isFavoriteOfUser', async function () {

        const results = await collect({ where: { isFavoriteOfUser: userA._id.toHexString() } })

        expect(results.map(x => x.id)).to.deep.equal([ obsA.id ])
      })

      it('filters by isFlaggedImportant true', async function () {

        const results = await collect({ where: { isFlaggedImportant: true } })

        expect(results.map(x => x.id)).to.deep.equal([ obsB.id ])
      })

      it('filters by hasAttachments true', async function () {

        const results = await collect({ where: { hasAttachments: true } })

        expect(results.map(x => x.id)).to.deep.equal([ obsB.id ])
      })

      it('filters by geometryIntersects, converting the bbox to a GeoJSON polygon', async function () {

        const results = await collect({ where: { geometryIntersects: [ 5, 5, 15, 15 ] } })

        expect(results.map(x => x.id)).to.deep.equal([ obsA.id ])
      })

      it('excludes attachment content by default', async function () {

        const results = await collect({ where: { ids: [ obsB.id ] } })

        expect(results[0].attachments).to.have.length(0)
      })

      it('includes attachments when includeAttachments is true', async function () {

        const results = await collect({ where: { ids: [ obsB.id ] }, includeAttachments: true })

        expect(results[0].attachments).to.have.length(1)
      })
    })

    describe('find', function () {

      it('returns an "all" result with all observations when no paging is given', async function () {

        const result = await repo.find({ where: {} })

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          expect(result.observations.map(x => x.id).sort()).to.deep.equal([ obsA.id, obsB.id, obsC.id ].sort())
        }
      })

      it('sorts by lastModified', async function () {

        const result = await repo.find({ where: {}, orderBy: { field: 'lastModified', order: 1 } })

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          expect(result.observations.map(x => x.id)).to.deep.equal([ obsA.id, obsB.id, obsC.id ])
        }
      })

      it('sorts by lastModified descending', async function () {

        const result = await repo.find({ where: {}, orderBy: { field: 'lastModified', order: -1 } })

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          expect(result.observations.map(x => x.id)).to.deep.equal([ obsC.id, obsB.id, obsA.id ])
        }
      })

      it('returns a "paged" result with a page of observations when paging is given', async function () {

        const result = await repo.find({
          where: {},
          orderBy: { field: 'lastModified', order: 1 },
          paging: { pageIndex: 0, pageSize: 2, includeTotalCount: true }
        })

        expect(result.type).to.equal('paged')
        if (result.type === 'paged') {
          expect(result.page.totalCount).to.equal(3)
          expect(result.page.items.map(x => x.id)).to.deep.equal([ obsA.id, obsB.id ])
        }
      })

      it('applies the given mapper to each result', async function () {

        const result = await repo.find({ where: { ids: [ obsA.id ] } }, obs => obs.id)

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          expect(result.observations).to.deep.equal([ obsA.id ])
        }
      })

      it('populates the user and important.user when populateUserNames is true', async function () {

        const result = await repo.find({ where: { ids: [ obsA.id, obsB.id ] }, populateUserNames: true })

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          const a = result.observations.find(x => x.id === obsA.id) as UsersExpandedObservationAttrs
          const b = result.observations.find(x => x.id === obsB.id) as UsersExpandedObservationAttrs
          expect(a.user).to.deep.equal({ id: userA._id.toHexString(), displayName: userA.displayName })
          expect(b.important?.user).to.deep.equal({ id: userB._id.toHexString(), displayName: userB.displayName })
        }
      })

      it('does not populate user when populateUserNames is not given', async function () {

        const result = await repo.find({ where: { ids: [ obsA.id ] } })

        expect(result.type).to.equal('all')
        if (result.type === 'all') {
          expect((result.observations[0] as UsersExpandedObservationAttrs).user).to.be.undefined
        }
      })
    })
  })
})
