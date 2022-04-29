import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import uniqid from 'uniqid'
import _ from 'lodash'
import { MongooseMageEventRepository, MageEventModel } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseObservationRepository } from '../../../lib/adapters/observations/adapters.observations.db.mongoose'
import * as legacy from '../../../lib/models/observation'
import * as legacyEvent from '../../../lib/models/event'
import { MageEventDocument } from '../../../src/models/event'
import TeamModelModule = require('../../../lib/models/team')

import { MageEvent, MageEventAttrs, MageEventCreateAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { ObservationModel } from '../../../src/models/observation'
import { ObservationAttrs, ObservationId, Observation, ObservationRepositoryError, ObservationRepositoryErrorCode, validationResultMessage, copyObservationAttrs } from '../../../lib/entities/observations/entities.observations'
import { AttachmentPresentationType, FormFieldType, Form, AttachmentMediaTypes } from '../../../lib/entities/events/entities.events.forms'
import util from 'util'

const TeamModel = TeamModelModule.TeamModel

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
    attachments: [],
    states: [],
  }
  return attrs
}

function omitUndefinedValues<T extends object>(x: T): T {
  return _.omitBy(x, v => v === undefined) as T
}

describe.only('mongoose observation repository', function() {

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

        console.log(validationResultMessage(observation.validation))
        expect(observation.validation.hasErrors).to.be.true
        expect(err).to.be.instanceOf(ObservationRepositoryError)
        expect(err.code).to.equal(ObservationRepositoryErrorCode.InvalidObservation)
        const count = await model.count({})
        expect(count).to.equal(0)
      })

      it('saves a minimal valid observation', async function() {

        const id = await repo.allocateObservationId()
        const attrs = observationStub(id, event.id)
        const observation = Observation.evaluate(attrs, event)
        const saved = await repo.save(observation) as Observation
        const found = await repo.findById(id) as Observation
        const savedAttrs = copyObservationAttrs(saved)
        const foundAttrs = copyObservationAttrs(found)
        const count = await model.count({})

        expect(saved).to.be.instanceOf(Observation)
        expect(saved.id).to.equal(id)
        expect(saved.validation.hasErrors).to.be.false
        expect(omitUndefinedValues(savedAttrs)).to.deep.equal(attrs)
        expect(omitUndefinedValues(foundAttrs)).to.deep.equal(attrs)
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
            oriented: false,
            thumbnails: [],
            contentType: AttachmentMediaTypes[AttachmentPresentationType.Image][0]
          }
        ]
        attrs.states = [
          {
            id: mongoose.Types.ObjectId().toHexString(),
            name: 'active',
            userId: mongoose.Types.ObjectId().toHexString()
          }
        ]
        attrs.importantFlag = {

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
  })
})