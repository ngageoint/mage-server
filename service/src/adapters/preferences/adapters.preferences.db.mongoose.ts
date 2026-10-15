import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { AddRecentFormFieldChoiceEntry, EventPreference, RecentChoice, UserId, UserPreference, UserPreferenceRepository } from '../../entities/users/entities.users'
import mongoose from 'mongoose'
import { MageEventId } from '../../entities/events/entities.events'

export type UserPreferenceDocument = UserPreference & mongoose.Document
export type UserPreferenceModel = mongoose.Model<UserPreferenceDocument>
export const UserPreferencesModelName = 'UserPreference'

export const UserPreferenceSchema = new mongoose.Schema<any>({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  events: {
    type: Map,
    of: {
      forms: {
        type: Map,
        of: {
          fields: {
            type: Map,
            of: {
              recentChoices: [String]
            }
          }
        }
      }
    },
    default: {}
  }
},{
  _id: false,
  versionKey: false
})

export function UserPreferenceModel(conn: mongoose.Connection, collection?: string): UserPreferenceModel {
  return conn.model(UserPreferencesModelName, UserPreferenceSchema, collection || 'user_preferences') as any
}

export class MongoosePreferenceRepository extends BaseMongooseRepository<UserPreferenceDocument, UserPreferenceModel, UserPreference> implements UserPreferenceRepository {
  constructor(model: mongoose.Model<UserPreferenceDocument>) {
    super(model, {
      docToEntity: doc => {
        const json = doc.toJSON<UserPreference>()
        return {
          ...json,
          id: doc._id
        }
      }
    })
  }

  async getPreferences(userId: UserId): Promise<UserPreference | null> {
    const doc = await this.model.findById(userId)
    if (!doc) {
      return null
    }

    return this.entityForDocument(doc)
  }

  async getEventPreferences(userId: UserId, eventId: MageEventId): Promise<EventPreference | null> {
    const preferences = await this.getPreferences(userId)
    return preferences?.events[eventId] ?? null
  }

  async addRecentFormFieldChoices(userId: UserId, choices: AddRecentFormFieldChoiceEntry[]): Promise<UserPreference> {
    const preferences = await this.getPreferences(userId)
    const recentChoicesByPath = choices.reduce((byPath, entry) => {
      const { eventId, formId, fieldName, choice } = entry
      const path = `events.${eventId}.forms.${formId}.fields.${fieldName}.recentChoices`
      const currentChoices = byPath[path] ?? preferences?.events?.[eventId]?.forms?.[formId]?.fields?.[fieldName]?.recentChoices ?? []
      const uniqueChoices = currentChoices.filter((currentChoice) => currentChoice !== choice)
      byPath[path] = [choice, ...uniqueChoices].slice(0, entry.recentChoicesLimit || 0)
      return byPath
    }, {} as Record<string, RecentChoice[]>)

    const doc = await this.model.findByIdAndUpdate(userId, {
      $set: recentChoicesByPath
    },{
      upsert: true,
      new: true
    })

    return this.entityForDocument(doc)
  }
}
