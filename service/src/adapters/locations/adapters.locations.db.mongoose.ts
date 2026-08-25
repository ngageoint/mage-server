import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'
import mongoose, { FilterQuery, QueryOptions } from 'mongoose'
import { MageEventId } from '../../entities/events/entities.events'
import { FindUserLocationsSort, FindUserLocationsSpec, FindUserLocationsStreamSpec, UserLocation, UserLocationProperties, UserLocationRepository } from '../../entities/locations/entities.locations'
import { pageOf, PageOf } from '../../entities/entities.global'
import { asyncIterable } from '../adapters.db.mongoose'

const Schema = mongoose.Schema

export const LocationModelName = 'Location'

export type UserLocationDocumentProperties = Omit<UserLocationProperties, 'deviceId'> & {
  deviceId: mongoose.Types.ObjectId
}

export type UserLocationDocument = Omit<UserLocation, 'eventId' | 'userId' | 'properties'> & {
  eventId: MageEventId
  userId: mongoose.Types.ObjectId
  properties: UserLocationDocumentProperties
}

export type UserLocationModelInstance = mongoose.HydratedDocument<UserLocationDocument>

export type UserLocationModel = mongoose.Model<UserLocationDocument>

const UserLocationPropertiesSchema = new Schema<UserLocationDocumentProperties>(
  {
    timestamp: { type: Date, required: true },
    deviceId: { type: Schema.Types.ObjectId, required: false, ref: 'Device' },
    provider: { type: String, required: false },
    altitude: { type: Number, required: false },
    accuracy: { type: Number, required: false },
    speed: { type: Number, required: false },
    bearing: { type: Number, required: false },
    battery_level: { type: Number, required: false },
  },
  { strict: false, _id: false, versionKey: false }
)

export const UserLocationSchema = new Schema<UserLocationDocument, UserLocationModel>(
  {
    userId: { type: Schema.Types.ObjectId, required: false, sparse: true, ref: 'User' },
    eventId: { type: Number, required: false, sparse: true, ref: 'Event' },
    type: { type: String, required: true },
    geometry: {
      type: { type: String, required: true },
      coordinates: { type: Array, required: true }
    },
    properties: { type: UserLocationPropertiesSchema, required: true }
  },
  { versionKey: false }
)

UserLocationSchema.index({ geometry: '2dsphere' })
UserLocationSchema.index({ 'properties.timestamp': 1 })
UserLocationSchema.index({ 'properties.timestamp': 1, _id: 1 })
UserLocationSchema.index({ userId: 1 })
UserLocationSchema.index({ 'properties.user': 1, 'properties.timestamp': 1 })
UserLocationSchema.index({ eventId: 1, userId: 1, 'properties.timestamp': 1, _id: 1 }, { background: true })

export function UserLocationModel(conn: mongoose.Connection, collection?: string): UserLocationModel {
  return conn.model<UserLocationDocument, UserLocationModel>(LocationModelName, UserLocationSchema)
}

function docToUserLocation(doc: UserLocationModelInstance): UserLocation {
  const json = doc.toJSON<UserLocation>()
  return {
    ...json,
    userId: doc.userId.toHexString(),
    properties: {
      ...json.properties,
      deviceId: doc.properties.deviceId?.toHexString()
    }
  } as UserLocation
}

export class MongooseUserLocationRepository extends BaseMongooseRepository<UserLocationDocument, UserLocationModel, UserLocation> implements UserLocationRepository {

  constructor(model: UserLocationModel) {
    super(model, { docToEntity: docToUserLocation })
  }

  async save(locations: UserLocation[]): Promise<UserLocation[]> {
    const docs = await this.model.create(locations)
    return docs.map(docToUserLocation)
  }

  async getUserLocations(findSpec: FindUserLocationsSpec): Promise<PageOf<UserLocation>> {
    const filter = buildLocationFilter(findSpec)
    const options: mongoose.QueryOptions<UserLocationDocument> = { sort: buildLocationSort(findSpec.orderBy) }
    const query = this.model.find(filter, null, options)
    const paging = findSpec.paging ?? { pageIndex: 0, pageSize: 2000 }
    const counted = await pageQuery(query, paging)
    const locations = await counted.query
    return pageOf(locations.map(this.entityForDocument), paging, counted.totalCount)
  }

  iterate(spec: FindUserLocationsStreamSpec): AsyncIterable<UserLocation> & { close?: () => void } {
    const filter = buildLocationFilter(spec)
    const queryOptions: QueryOptions<UserLocation> = {
      sort: { userId: 1, 'properties.timestamp': 1, _id: 1 }
    }
    const cursor = this.model.find(filter, {}, queryOptions).cursor()

    return asyncIterable(cursor, doc => {
      return docToUserLocation(doc)
    }, () => {
      cursor.close()
    })
  }

  async deleteLocationsForUser(userId: string): Promise<void> {
    await this.model.deleteMany({ userId: new mongoose.Types.ObjectId(userId) })
  }
}

function buildLocationFilter(findSpec: { where: FindUserLocationsSpec['where'] }): FilterQuery<UserLocationDocument> {
  const { where } = findSpec
  const query: FilterQuery<UserLocationDocument>[] = []

  query.push({ eventId: where.eventId })

  if (where.timestampAfter) {
    query.push({ 'properties.timestamp': { $gte: where.timestampAfter } })
  }
  if (where.timestampBefore) {
    query.push({ 'properties.timestamp': { $lt: where.timestampBefore } })
  }

  if (where.userIsAnyOf !== undefined) {
    query.push({ userId: { $in: where.userIsAnyOf } })
  }

  return query.length ? { $and: query } : {}
}

function buildLocationSort(sort?: FindUserLocationsSort): any {
  const order = typeof sort?.order === 'number' ? sort.order : 1
  return { 'properties.timestamp': order, _id: order || -1 }
}
