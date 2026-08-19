import mongoose, { PopulatedDoc, Schema } from 'mongoose'
import {
  RecentUserLocations,
  RecentUserLocationsReadOptions,
  RecentUserLocationsRepository,
  UserLocation
} from '../../entities/locations/entities.locations'
import { UserId } from '../../entities/users/entities.users'
import { UserDocument } from '../users/adapters.users.db.mongoose'
import { UserLocationSchema } from './adapters.locations.db.mongoose'

export const RecentUserLocationsModelName = 'CappedLocation'
const recentLocationsLimit = 100

export type RecentUserLocationsDocument = mongoose.Document & Omit<RecentUserLocations, 'userId'> & {
  userId: PopulatedDoc<UserDocument> | null
}

export type RecentUserLocationsModel = mongoose.Model<RecentUserLocationsDocument>

export const RecentUserLocationsSchema = new Schema<RecentUserLocationsDocument>({
  userId: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  eventId: { type: Number, required: false, ref: 'Event' },
  locations: [UserLocationSchema]
}, {
  versionKey: false
})

RecentUserLocationsSchema.index({ eventId: 1 }, { sparse: true })
RecentUserLocationsSchema.index({ 'locations.properties.timestamp': 1, eventId: 1 })

export function RecentUserLocationsModel(conn: mongoose.Connection, collection?: string): RecentUserLocationsModel {
  return conn.model(RecentUserLocationsModelName, RecentUserLocationsSchema, collection || 'cappedlocations') as any
}

export class MongooseRecentUserLocationsRepository implements RecentUserLocationsRepository {

  constructor(private model: RecentUserLocationsModel) {}

  async addLocations(userId: UserId, eventId: number, locations: UserLocation[]): Promise<RecentUserLocations> {
    const update = {
      $push: {
        locations: { $each: locations, $sort: { 'properties.timestamp': 1 }, $slice: -1 * recentLocationsLimit }
      }
    }
    const doc = await this.model.findOneAndUpdate({ userId, eventId }, update, { upsert: true, new: true })
    return this.entityForDocument(doc!)
  }

  async findLocations(options: RecentUserLocationsReadOptions): Promise<RecentUserLocations[]> {
    let limit = options.limit
    limit = limit && limit <= recentLocationsLimit ? limit : recentLocationsLimit

    const filter = options.filter || {}
    const conditions: any = {}
    if (filter.eventId) {
      conditions.eventId = filter.eventId
    }

    const query = this.model.find(conditions, { userId: 1, eventId: 1, locations: { $slice: -1 * limit } })

    if (filter.startDate) {
      query.where('locations.properties.timestamp').gte(filter.startDate as any)
    }

    if (filter.endDate) {
      query.where('locations.properties.timestamp').lt(filter.endDate as any)
    }

    if (options.populate) {
      query.populate({
        path: 'userId',
        select: 'icon avatar displayName email phones'
      })
    }

    const docs = await query.exec()
    return docs.map(doc => this.entityForDocument(doc))
  }

  async removeLocationsForUser(userId: UserId): Promise<void> {
    await this.model.deleteMany({ userId })
  }

  private entityForDocument(doc: RecentUserLocationsDocument): RecentUserLocations {
    const json: any = doc.toJSON()
    const populated = doc.populated('userId')
    return {
      userId: populated ? (doc.userId as any).id : (doc.userId as any)?.toHexString?.() ?? json.userId,
      eventId: json.eventId,
      user: populated ? (doc.userId as any).toJSON() : undefined,
      locations: (json.locations || []).slice().reverse()
    }
  }
}
