import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import { MongooseMageEventRepository } from '../../../lib/adapters/events/adapters.events.db.mongoose'
import { MongooseObservationSearchRepository, ObservationSearchModel, ObservationSearchModelName } from '../../../lib/adapters/observations/adapters.observations.search.db.mongoose'
import * as legacyEvent from '../../../lib/models/event'
import { MageEvent, MageEventAttrs, MageEventCreateAttrs, MageEventId } from '../../../lib/entities/events/entities.events'
import { Condition, ObservationAttrs, ObservationId, SimpleCondition } from '../../../lib/entities/observations/entities.observations'
import { FormFieldType, Form } from '../../../lib/entities/events/entities.events.forms'
import { MageEventDocument, MageEventModelInstance } from '../../../src/models/event'
import util from 'util'

function observationStub(id: ObservationId, eventId: MageEventId): ObservationAttrs {
  const now = Date.now()
  return {
    id,
    eventId,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [ 0, 0 ] },
    createdAt: new Date(now),
    lastModified: new Date(now),
    properties: { timestamp: new Date(now), forms: [] },
    states: [],
    favoriteUserIds: [],
    attachments: [],
  }
}

async function* toAsyncIterable(observations: ObservationAttrs[]): AsyncIterable<ObservationAttrs> {
  for (const obs of observations) {
    yield obs
  }
}

describe('mongoose observation search repository', function () {

  let searchModel: ObservationSearchModel
  let searchRepo: MongooseObservationSearchRepository
  let event1: MageEvent
  let event2: MageEvent
  let formId1: number
  let formId2: number
  let createEvent: (attrs: MageEventCreateAttrs & Partial<MageEventAttrs>) => Promise<MageEventModelInstance>

  beforeEach('initialize model', async function () {
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
      }).then(createdWithoutTeamId => {
        return MageEventModel.findById(createdWithoutTeamId._id).then((withTeamId: any) => {
          if (withTeamId) {
            return withTeamId
          }
          throw new Error(`created event ${createdWithoutTeamId._id} now does not exist!`)
        })
      })
    }

    let eventDoc1 = await createEvent({ name: `Search Test Event 1 ${new mongoose.Types.ObjectId().toHexString()}`, maxObservationForms: 2 })
    const addForm = util.promisify(legacyEvent.addForm) as (eventId: MageEventId, form: Form) => Promise<MageEventModelInstance>
    eventDoc1 = await addForm(eventDoc1._id, {
      id: 1,
      archived: false,
      name: 'Form 1',
      color: '#aa0000',
      fields: [
        { type: FormFieldType.Text, id: 1, name: 'textField', title: 'Text Field', required: false },
        { type: FormFieldType.Numeric, id: 2, name: 'numericField', title: 'Numeric Field', required: false },
        { type: FormFieldType.DateTime, id: 3, name: 'dateField', title: 'Date Field', required: false },
        {
          type: FormFieldType.MultiSelectDropdown, id: 4, name: 'multiField', title: 'Multi Field', required: false,
          choices: [ { id: 1, title: 'A', value: 1 }, { id: 2, title: 'B', value: 2 }, { id: 3, title: 'C', value: 3 } ]
        },
      ],
      userFields: []
    })
    eventDoc1 = await addForm(eventDoc1._id, {
      id: 2,
      archived: false,
      name: 'Form 2',
      color: '#0000aa',
      fields: [
        { type: FormFieldType.Text, id: 1, name: 'textField', title: 'Text Field', required: false },
      ],
      userFields: []
    })
    event1 = new MageEvent(eventRepo.entityForDocument(eventDoc1))

    let eventDoc2 = await createEvent({ name: `Search Test Event 2 ${new mongoose.Types.ObjectId().toHexString()}` })
    eventDoc2 = await addForm(eventDoc2._id, {
      id: 1,
      archived: false,
      name: 'Form 1',
      color: '#00aa00',
      fields: [
        { type: FormFieldType.Text, id: 1, name: 'textField', title: 'Text Field', required: false },
      ],
      userFields: []
    })
    event2 = new MageEvent(eventRepo.entityForDocument(eventDoc2))
    formId1 = event1.forms[0].id
    formId2 = event1.forms[1].id

    searchModel = (mongoose.connection.models[ObservationSearchModelName] as ObservationSearchModel) || ObservationSearchModel(mongoose.connection)
    await searchModel.ensureIndexes()
    searchRepo = new MongooseObservationSearchRepository(searchModel)
  })

  afterEach(async function () {
    await legacyEvent.Model.deleteMany({})
    if (searchModel) {
      await searchModel.deleteMany({})
    }
  })

  describe('save', function () {

    it('indexes each form entry on the observation', async function () {
      const obs: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: {
          timestamp: new Date(),
          forms: [
            { id: '1', formId: formId1, textField: 'alpha' },
            { id: '2', formId: formId2, textField: 'beta' }
          ]
        }
      }
      await searchRepo.save(obs)

      const docs = await searchModel.find({ observationId: new mongoose.Types.ObjectId(obs.id) })
      expect(docs).to.have.length(2)
    })

    it('replaces previously indexed entries for the observation on re-save', async function () {
      const id = new mongoose.Types.ObjectId().toHexString()
      const original: ObservationAttrs = {
        ...observationStub(id, event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'original' } ] }
      }
      await searchRepo.save(original)

      const updated: ObservationAttrs = {
        ...observationStub(id, event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'updated' } ] }
      }
      await searchRepo.save(updated)

      const docs = await searchModel.find({ observationId: new mongoose.Types.ObjectId(id) })
      expect(docs).to.have.length(1)
      expect(docs[0].textField).to.equal('updated')
    })
  })

  describe('populate', function () {

    it('indexes all observations and returns the count of form entries inserted', async function () {
      const obs1: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'alpha' } ] }
      }
      const obs2: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'beta' } ] }
      }

      const count = await searchRepo.populate(event1.id, toAsyncIterable([ obs1, obs2 ]))

      expect(count).to.equal(2)
      const condition: SimpleCondition = { formId: formId1, field: 'textField', operator: 'IN', value: [ 'alpha', 'beta' ] }
      const ids = await searchRepo.findIdsByFilter({ condition }, event1)
      expect(ids).to.have.members([ obs1.id, obs2.id ])
    })

    it('skips already-indexed form entries on a subsequent populate without force', async function () {
      const obs: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'alpha' } ] }
      }
      await searchRepo.populate(event1.id, toAsyncIterable([ obs ]))

      const count = await searchRepo.populate(event1.id, toAsyncIterable([ obs ]))

      expect(count).to.equal(0)
    })

    it('clears existing docs for the event and re-indexes when force is true', async function () {
      const original: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'original' } ] }
      }
      await searchRepo.populate(event1.id, toAsyncIterable([ original ]))

      const replacement: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'replacement' } ] }
      }
      const count = await searchRepo.populate(event1.id, toAsyncIterable([ replacement ]), true)

      expect(count).to.equal(1)
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: '=', value: 'original' } }, event1)).to.be.empty
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: '=', value: 'replacement' } }, event1)).to.deep.equal([ replacement.id ])
    })
  })

  describe('findIdsByFilter: keyword', function () {

    it('finds an observation matching a word in a text field', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'hurricane damage reported' } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'all clear' } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ keyword: 'hurricane' }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('requires all keyword terms to match (AND semantics)', async function () {
      const matchesBoth: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'severe hurricane damage' } ] }
      }
      const matchesOne: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'hurricane approaching' } ] }
      }
      await searchRepo.save(matchesBoth)
      await searchRepo.save(matchesOne)

      const ids = await searchRepo.findIdsByFilter({ keyword: 'hurricane damage' }, event1)

      expect(ids).to.deep.equal([ matchesBoth.id ])
    })

    it('matches an exact quoted phrase', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'this is an exact usecase for phrase search' } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'usecase that is not exact' } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ keyword: '"exact usecase"' }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('does not find observations from a different event', async function () {
      const obs: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'hurricane damage' } ] }
      }
      await searchRepo.save(obs)

      const ids = await searchRepo.findIdsByFilter({ keyword: 'hurricane' }, event2)

      expect(ids).to.be.empty
    })

    it('returns an empty array when the filter is empty', async function () {
      const ids = await searchRepo.findIdsByFilter({}, event1)
      expect(ids).to.be.empty
    })
  })

  describe('findIdsByFilter: condition operators', function () {

    it('= matches an exact text value', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'target' } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'other' } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: '=', value: 'target' } }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('!= excludes an exact text value', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'other' } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'target' } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: '!=', value: 'target' } }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('> >= < <= compare numeric values', async function () {
      const low: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, numericField: 10 } ] }
      }
      const mid: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, numericField: 20 } ] }
      }
      const high: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, numericField: 30 } ] }
      }
      await searchRepo.save(low)
      await searchRepo.save(mid)
      await searchRepo.save(high)

      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'numericField', operator: '>', value: 20 } }, event1)).to.deep.equal([ high.id ])
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'numericField', operator: '>=', value: 20 } }, event1)).to.have.members([ mid.id, high.id ])
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'numericField', operator: '<', value: 20 } }, event1)).to.deep.equal([ low.id ])
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'numericField', operator: '<=', value: 20 } }, event1)).to.have.members([ low.id, mid.id ])
    })

    it('LIKE matches a case-insensitive substring', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'Bridge Collapsed' } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'Road Blocked' } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: 'LIKE', value: 'bridge' } }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('IN and NOT IN match against a list of values', async function () {
      const a: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'a' } ] }
      }
      const b: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'b' } ] }
      }
      const c: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, textField: 'c' } ] }
      }
      await searchRepo.save(a)
      await searchRepo.save(b)
      await searchRepo.save(c)

      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: 'IN', value: [ 'a', 'b' ] } }, event1)).to.have.members([ a.id, b.id ])
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: 'NOT IN', value: [ 'a', 'b' ] } }, event1)).to.deep.equal([ c.id ])
    })

    it('BETWEEN matches an inclusive numeric range', async function () {
      const below: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, numericField: 5 } ] }
      }
      const within: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, numericField: 15 } ] }
      }
      const above: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, numericField: 25 } ] }
      }
      await searchRepo.save(below)
      await searchRepo.save(within)
      await searchRepo.save(above)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'numericField', operator: 'BETWEEN', value: [ 10, 20 ] } }, event1)

      expect(ids).to.deep.equal([ within.id ])
    })

    it('IS NULL and IS NOT NULL check for field presence', async function () {
      const withField: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'present' } ] }
      }
      const withoutField: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, numericField: 1 } ] }
      }
      await searchRepo.save(withField)
      await searchRepo.save(withoutField)

      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: 'IS NULL' } }, event1)).to.deep.equal([ withoutField.id ])
      expect(await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: 'IS NOT NULL' } }, event1)).to.deep.equal([ withField.id ])
    })

    it('compares a DateTime field using ISO8601 string values', async function () {
      const earlier: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, dateField: new Date('2024-01-01T00:00:00Z') } ] }
      }
      const later: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, dateField: new Date('2024-06-01T00:00:00Z') } ] }
      }
      await searchRepo.save(earlier)
      await searchRepo.save(later)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'dateField', operator: '>', value: '2024-03-01T00:00:00Z' } }, event1)

      expect(ids).to.deep.equal([ later.id ])
    })

    it('= on a multi-select field matches when the value is one of the selections', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, multiField: [ 1, 2 ] } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, multiField: [ 3 ] } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'multiField', operator: '=', value: 2 } }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('!= on a multi-select field excludes when the value is one of the selections', async function () {
      const matching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, multiField: [ 3 ] } ] }
      }
      const notMatching: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, multiField: [ 1, 2 ] } ] }
      }
      await searchRepo.save(matching)
      await searchRepo.save(notMatching)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'multiField', operator: '!=', value: 2 } }, event1)

      expect(ids).to.deep.equal([ matching.id ])
    })

    it('scopes the condition to the given formId when the same field name exists on multiple forms', async function () {
      const form1Match: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'target' } ] }
      }
      const form2Match: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId2, textField: 'target' } ] }
      }
      await searchRepo.save(form1Match)
      await searchRepo.save(form2Match)

      const ids = await searchRepo.findIdsByFilter({ condition: { formId: formId1, field: 'textField', operator: '=', value: 'target' } }, event1)

      expect(ids).to.deep.equal([ form1Match.id ])
    })
  })

  describe('findIdsByFilter: compound conditions', function () {

    it('AND requires all conditions to match', async function () {
      const matchesBoth: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'target', numericField: 42 } ] }
      }
      const matchesOnlyText: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'target', numericField: 99 } ] }
      }
      await searchRepo.save(matchesBoth)
      await searchRepo.save(matchesOnlyText)

      const condition: Condition = {
        and: [
          { formId: formId1, field: 'textField', operator: '=', value: 'target' },
          { formId: formId1, field: 'numericField', operator: '=', value: 42 },
        ]
      }
      const ids = await searchRepo.findIdsByFilter({ condition }, event1)

      expect(ids).to.deep.equal([ matchesBoth.id ])
    })

    it('OR matches any condition', async function () {
      const matchesText: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'target', numericField: 99 } ] }
      }
      const matchesNumber: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'other', numericField: 42 } ] }
      }
      const matchesNeither: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, textField: 'other', numericField: 99 } ] }
      }
      await searchRepo.save(matchesText)
      await searchRepo.save(matchesNumber)
      await searchRepo.save(matchesNeither)

      const condition: Condition = {
        or: [
          { formId: formId1, field: 'textField', operator: '=', value: 'target' },
          { formId: formId1, field: 'numericField', operator: '=', value: 42 },
        ]
      }
      const ids = await searchRepo.findIdsByFilter({ condition }, event1)

      expect(ids).to.have.members([ matchesText.id, matchesNumber.id ])
    })

    it('supports a nested AND within an OR', async function () {
      const matchesAndBranch: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'target', numericField: 42 } ] }
      }
      const matchesOrBranch: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'fallback', numericField: 99 } ] }
      }
      const matchesNeither: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, textField: 'target', numericField: 99 } ] }
      }
      await searchRepo.save(matchesAndBranch)
      await searchRepo.save(matchesOrBranch)
      await searchRepo.save(matchesNeither)

      const condition: Condition = {
        or: [
          { and: [
            { formId: formId1, field: 'textField', operator: '=', value: 'target' },
            { formId: formId1, field: 'numericField', operator: '=', value: 42 },
          ] },
          { formId: formId1, field: 'textField', operator: '=', value: 'fallback' },
        ]
      }
      const ids = await searchRepo.findIdsByFilter({ condition }, event1)

      expect(ids).to.have.members([ matchesAndBranch.id, matchesOrBranch.id ])
    })
  })

  describe('findIdsByFilter: keyword and condition combined', function () {

    it('intersects the keyword and condition matches', async function () {
      const matchesBoth: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'hurricane', numericField: 42 } ] }
      }
      const matchesOnlyKeyword: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '2', formId: formId1, textField: 'hurricane', numericField: 99 } ] }
      }
      const matchesOnlyCondition: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '3', formId: formId1, textField: 'clear skies', numericField: 42 } ] }
      }
      await searchRepo.save(matchesBoth)
      await searchRepo.save(matchesOnlyKeyword)
      await searchRepo.save(matchesOnlyCondition)

      const ids = await searchRepo.findIdsByFilter({
        keyword: 'hurricane',
        condition: { formId: formId1, field: 'numericField', operator: '=', value: 42 }
      }, event1)

      expect(ids).to.deep.equal([ matchesBoth.id ])
    })

    it('returns no results when the keyword matches nothing, without evaluating the condition', async function () {
      const obs: ObservationAttrs = {
        ...observationStub(new mongoose.Types.ObjectId().toHexString(), event1.id),
        properties: { timestamp: new Date(), forms: [ { id: '1', formId: formId1, textField: 'clear skies', numericField: 42 } ] }
      }
      await searchRepo.save(obs)

      const ids = await searchRepo.findIdsByFilter({
        keyword: 'hurricane',
        condition: { formId: formId1, field: 'numericField', operator: '=', value: 42 }
      }, event1)

      expect(ids).to.be.empty
    })
  })
})
