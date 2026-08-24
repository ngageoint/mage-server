import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import mongoose, { FilterQuery, PopulatedDoc, QueryOptions, Schema } from 'mongoose'
import {
  UserLocation,
  UserLocationCreateAttrs,
  UserLocationReadOptions,
  UserLocationRepository
} from '../../entities/locations/entities.locations'
import { asyncIterable } from '../adapters.db.mongoose'
import { UserId } from '../../entities/users/entities.users'
import { UserDocument } from '../users/adapters.users.db.mongoose'

export const LocationModelName = 'Location'

export type UserLocationDocument = Omit<UserLocation, 'userId' | 'properties'> & {
  userId: PopulatedDoc<UserDocument> | null
  properties: Omit<UserLocation['properties'], 'deviceId'> & {
    deviceId: mongoose.Types.ObjectId | null
  }
}

export type UserLocationModel = mongoose.Model<UserLocationDocument>

export const UserLocationSchema = new Schema<UserLocationDocument>({
  userId: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  eventId: { type: Number, required: false, sparse: true, ref: 'Event' },
  /**
   * TODO: nothing appears to reference this. see the same TODO on the
   * `UserLocation` entity type.
   */
  teamIds: [{ type: Schema.Types.ObjectId }],
  type: { type: String, required: true },
  geometry: {
    type: { type: String, required: true },
    coordinates: { type: Array, required: true }
  },
  properties: Schema.Types.Mixed
}, {
  versionKey: false
})

UserLocationSchema.index({ geometry: '2dsphere' })
UserLocationSchema.index({ 'properties.timestamp': 1 })
UserLocationSchema.index({ 'properties.timestamp': 1, _id: 1 })
UserLocationSchema.index({ userId: 1 }, { sparse: true })
// TODO: should add _id to the end of the index for consistent ordering
UserLocationSchema.index({ 'properties.user': 1, 'properties.timestamp': 1 })
UserLocationSchema.index({ eventId: 1, userId: 1, 'properties.timestamp': 1, _id: 1 }, { background: true })

export function UserLocationModel(conn: mongoose.Connection, collection?: string): UserLocationModel {
  return conn.model(LocationModelName, UserLocationSchema, collection || 'locations') as any
}

export class MongooseUserLocationRepository extends BaseMongooseRepository<UserLocationDocument, UserLocationModel, UserLocation> implements UserLocationRepository {

  constructor(model: UserLocationModel) {
    super(model)
  }

  async createLocations(locations: UserLocationCreateAttrs[]): Promise<UserLocation[]> {
    const created = await this.model.create(locations as any[])
    return created.map(doc => this.toUserLocation(doc))
  }

  getLocations(options: UserLocationReadOptions): AsyncIterable<UserLocation> & { close?: () => void }  {

    const conditions: FilterQuery<UserLocation> = {}

    const filter = options.filter || {}
    if (filter.eventId) {
      conditions.eventId = filter.eventId
    }

    if (filter.userId) {
      conditions.userId = filter.userId
    }

    if (filter.lastLocationId && (filter.startDate || filter.endDate)) {
      conditions['$or'] = [{ _id: { '$gt': filter.lastLocationId } }]
      if (filter.startDate) {
        conditions['$or'] = [{
          _id: { '$gt': filter.lastLocationId },
          'properties.timestamp': filter.startDate
        }, {
          'properties.timestamp': { '$gt': filter.startDate }
        }]
      }

      if (filter.endDate) conditions['properties.timestamp'] = { '$lt': filter.endDate }
    } else if (filter.startDate || filter.endDate) {
      conditions['properties.timestamp'] = {}
      if (filter.startDate) conditions['properties.timestamp']['$gte'] = filter.startDate
      if (filter.endDate) conditions['properties.timestamp']['$lt'] = filter.endDate
    }

    const queryOptions: QueryOptions<UserLocation> = {}

    if(options.sort) {
      queryOptions.sort = options.sort
    } else {
      queryOptions.sort = { "properties.timestamp": 1, _id: 1 }
    }

    if (options.lean) {
      queryOptions.lean = options.lean
    }

    const cursor = this.model.find(conditions, {}, queryOptions).cursor()

    return asyncIterable(cursor, doc => this.toUserLocation(doc), () => {
      cursor.close()
    })
  }

  async removeLocationsForUser(userId: UserId): Promise<void> {
    await this.model.deleteMany({ userId })
  }

  private toUserLocation(doc: UserLocationDocument): UserLocation {
    // `doc` is a plain lean object, not a mongoose Document, when queried with `lean: true`
    const json: any = typeof (doc as any).toJSON === 'function' ? (doc as any).toJSON() : doc
    return {
      ...json,
      id: json._id ? String(json._id) : json.id,
      userId: doc.userId ? (doc.userId as any).toHexString() : doc.userId,
      properties: {
        ...doc.properties,
        deviceId: doc.properties.deviceId ? doc.properties.deviceId.toHexString() : null
      }
    } as unknown as UserLocation
  }
}
