import mongoose from 'mongoose'
import { MageEventId } from '../../entities/events/entities.events'
import { AddRecentUserLocationsSpec, FindRecentUserLocationsSpec, LocationUserExpanded, RecentUserLocations, RecentUserLocationsRepository, UserLocation } from '../../entities/locations/entities.locations'
import { UserId } from '../../entities/users/entities.users'
import { UserLocationDocument, UserLocationSchema } from './adapters.locations.db.mongoose'

const Schema = mongoose.Schema

export const RecentUserLocationsModelName = 'CappedLocation'

// TODO this should come from config somewhere
const locationLimit = 100

export type RecentUserLocationsDocument = mongoose.Document & {
  userId: mongoose.Types.ObjectId
  eventId: MageEventId
  locations: UserLocationDocument[]
}

export type RecentUserLocationsModel = mongoose.Model<RecentUserLocationsDocument>

export const RecentUserLocationsSchema = new Schema<RecentUserLocationsDocument, RecentUserLocationsModel>(
  {
    userId: { type: Schema.Types.ObjectId, required: false, sparse: true, ref: 'User' },
    eventId: { type: Number, required: false, sparse: true, ref: 'Event' },
    locations: [UserLocationSchema]
  },
  { versionKey: false }
)

RecentUserLocationsSchema.index({ eventId: 1 })
RecentUserLocationsSchema.index({ 'locations.properties.timestamp': 1 })
RecentUserLocationsSchema.index({ 'locations.properties.timestamp': 1, eventId: 1 })

export function RecentUserLocationModel(conn: mongoose.Connection, collection?: string): RecentUserLocationsModel {
  return conn.model<RecentUserLocationsDocument, RecentUserLocationsModel>(RecentUserLocationsModelName, RecentUserLocationsSchema)
}

export class MongooseRecentUserLocationsRepository implements RecentUserLocationsRepository {

  constructor(readonly model: RecentUserLocationsModel) {}

  async addLocations(spec: AddRecentUserLocationsSpec): Promise<RecentUserLocations> {
    const update = {
      $push: {
        locations: {
          $each: spec.locations,
          $sort: { 'properties.timestamp': 1 },
          $slice: -1 * locationLimit
        }
      }
    }
    const doc = await this.model.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(spec.userId), eventId: spec.eventId },
      update,
      { upsert: true, new: true }
    )
    return entityForDocument(doc!)
  }

  async findLocations(spec: FindRecentUserLocationsSpec): Promise<RecentUserLocations[]> {
    const { where, limit = locationLimit } = spec
    const cappedLimit = Math.min(limit, locationLimit)

    const query = this.model.find(
      { eventId: where.eventId },
      { userId: 1, locations: { $slice: -1 * cappedLimit } }
    )

    if (where.timestampAfter) {
      query.where('locations.properties.timestamp').gte(where.timestampAfter as any)
    }
    if (where.timestampBefore) {
      query.where('locations.properties.timestamp').lt(where.timestampBefore as any)
    }

    if (where.userIsAnyOf !== undefined) {
      query.where({ 'userId': { $in: where.userIsAnyOf } })
    }

    if (spec.populate) {
      query.populate({ path: 'userId', select: 'displayName icon' })
    }

    const docs = await query.exec()
    return docs.map(entityForDocument)
  }

  async deleteLocationsForUser(userId: UserId): Promise<void> {
    await this.model.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
  }
}

function entityForDocument(doc: RecentUserLocationsDocument): RecentUserLocations {
  const populatedUserId = doc.populated('userId') as mongoose.Types.ObjectId | undefined
  const rawUserId = doc.userId as mongoose.Types.ObjectId | null
  const userId: string = (populatedUserId ?? rawUserId)?.toHexString() ?? ''
  const populatedUserDoc = populatedUserId && !(doc.userId instanceof mongoose.Types.ObjectId) ? doc.userId as any : null
  const user: LocationUserExpanded | undefined = populatedUserDoc
    ? { id: userId, displayName: populatedUserDoc.displayName, icon: populatedUserDoc.icon?.toObject() }
    : undefined
  return {
    userId,
    eventId: doc.eventId,
    locations: (doc.locations || []).reverse().map(locationDoc => {
      const json = locationDoc.toJSON<UserLocation>()
      return {
        ...json,
        userId: locationDoc.userId.toHexString(),
        properties: {
          ...json.properties,
          deviceId: locationDoc.properties.deviceId?.toHexString()
        }
      } as UserLocation
    }),
    user
  }
}
