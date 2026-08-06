import { expect } from 'chai'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { MongoosePreferenceRepository, UserPreferenceDocument, UserPreferenceModel } from '../../../lib/adapters/preferences/adapters.preferences.db.mongoose'
import { UserPreference } from '../../../lib/entities/users/entities.users'

describe('user preferences mongoose repository', function() {

  let mongo: MongoMemoryServer
  let uri: string
  let conn: mongoose.Connection
  let model: mongoose.Model<UserPreferenceDocument>
  let repo: MongoosePreferenceRepository
  const userId = new mongoose.Types.ObjectId().toHexString()

  before(async function() {
    mongo = await MongoMemoryServer.create()
    uri = mongo.getUri()
  })

  beforeEach(async function() {
    conn = await mongoose.createConnection(uri).asPromise()
    model = UserPreferenceModel(conn, 'test_user_preferences')
    repo = new MongoosePreferenceRepository(model)
  })

  afterEach(async function() {
    await model.deleteMany({})
    await conn.close()
  })

  after(async function() {
    await mongo.stop()
  })

  describe('getting preferences for a user with none saved', function() {

    it('returns null', async function() {
      const found = await repo.getPreferences(userId)
      expect(found).to.be.null
    })
  })

  describe('getting event preferences for a user with none saved', function() {

    it('returns null', async function() {
      const found = await repo.getEventPreferences(userId, 1)
      expect(found).to.be.null
    })
  })

  describe('adding recent form field choices', function() {

    it('creates the preference document if none existed', async function() {

      const created = await repo.addRecentFormFieldChoices(userId, [
        { eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' }
      ])

      expect(created.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['blue'])
    })

    it('adds a new choice to the front of the list', async function() {

      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' }])
      const updated = await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'green' }])

      expect(updated.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['green', 'blue'])
    })

    it('moves a re-selected choice back to the front instead of duplicating it', async function() {

      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' }])
      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'green' }])
      const updated = await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' }])

      expect(updated.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['blue', 'green'])
    })

    it('truncates to the default limit of 5 when no limit is given', async function() {

      for (const choice of ['a', 'b', 'c', 'd', 'e', 'f']) {
        await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice }])
      }

      const preferences = await repo.getPreferences(userId)

      expect(preferences?.events[1].forms[1].fields['field1'].recentChoices)
        .to.deep.equal(['f', 'e', 'd', 'c', 'b'])
    })

    it('truncates to the given recentChoicesLimit', async function() {

      for (const choice of ['a', 'b', 'c']) {
        await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice, recentChoicesLimit: 2 }])
      }

      const preferences = await repo.getPreferences(userId)

      expect(preferences?.events[1].forms[1].fields['field1'].recentChoices)
        .to.deep.equal(['c', 'b'])
    })

    it('keeps preferences for different fields, forms, and events independent of each other', async function() {

      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' }])
      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 1, fieldName: 'field2', choice: 'big' }])
      await repo.addRecentFormFieldChoices(userId, [{ eventId: 1, formId: 2, fieldName: 'field1', choice: 'square' }])
      await repo.addRecentFormFieldChoices(userId, [{ eventId: 2, formId: 1, fieldName: 'field1', choice: 'north' }])

      const preferences = await repo.getPreferences(userId)

      expect(preferences?.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['blue'])
      expect(preferences?.events[1].forms[1].fields['field2'].recentChoices).to.deep.equal(['big'])
      expect(preferences?.events[1].forms[2].fields['field1'].recentChoices).to.deep.equal(['square'])
      expect(preferences?.events[2].forms[1].fields['field1'].recentChoices).to.deep.equal(['north'])
    })

    it('applies multiple choices for one observation in a single write', async function() {

      const updated = await repo.addRecentFormFieldChoices(userId, [
        { eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' },
        { eventId: 1, formId: 1, fieldName: 'field2', choice: 'big' },
        { eventId: 1, formId: 2, fieldName: 'field1', choice: 'square' }
      ])

      expect(updated.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['blue'])
      expect(updated.events[1].forms[1].fields['field2'].recentChoices).to.deep.equal(['big'])
      expect(updated.events[1].forms[2].fields['field1'].recentChoices).to.deep.equal(['square'])
    })

    it('applies repeated choices for the same field within one batch in order', async function() {

      const updated = await repo.addRecentFormFieldChoices(userId, [
        { eventId: 1, formId: 1, fieldName: 'field1', choice: 'blue' },
        { eventId: 1, formId: 1, fieldName: 'field1', choice: 'green' }
      ])

      expect(updated.events[1].forms[1].fields['field1'].recentChoices).to.deep.equal(['green', 'blue'])
    })
  })

  describe('getting event preferences for a user with saved preferences', function() {

    const preference: UserPreference = {
      events: {
        1: { forms: { 1: { fields: { field1: { recentChoices: ['blue'] } } } } },
        2: { forms: { 2: { fields: { field1: { recentChoices: ['green'] } } } } }
      }
    }

    beforeEach(async function() {
      await model.findByIdAndUpdate(userId, preference, { upsert: true })
    })

    it('returns only the preferences for the requested event', async function() {

      const found = await repo.getEventPreferences(userId, 1)

      expect(found?.forms[1].fields['field1'].recentChoices).to.deep.equal(['blue'])
    })

    it('returns null for an event with no saved preferences', async function() {

      const found = await repo.getEventPreferences(userId, 3)

      expect(found).to.be.null
    })
  })
})
