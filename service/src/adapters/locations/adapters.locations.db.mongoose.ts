import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import mongoose, { FilterQuery, QueryOptions } from 'mongoose'
import * as legacy from '../../models/location'
import { UserLocation, UserLocationReadOptions, UserLocationRepository } from '../../entities/locations/entities.locations'
import { asyncIterable } from '../adapters.db.mongoose'

export const LocationModelName = 'Location'

export type UserLocationDocument = legacy.UserLocationDocument
export type UserLocationModel = mongoose.Model<legacy.UserLocationDocument>
export const UserLocationSchema = legacy.Model.schema

export class MongooseUserLocationRepository extends BaseMongooseRepository<UserLocationDocument, UserLocationModel, UserLocation> implements UserLocationRepository {

  constructor(model: UserLocationModel) {
    super(model)
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

    let queryOptions: QueryOptions<UserLocation> = {}

    if(options.sort) {
      queryOptions.sort = options.sort
    } else {
      queryOptions.sort = { sort: { "properties.timestamp": 1, _id: 1 } }
    }

    if (options.lean) {
      queryOptions.lean = options.lean
    }

    const cursor = this.model.find(conditions, {}, queryOptions).cursor()

    return asyncIterable(cursor, doc => {
      const userLocation: UserLocation = {
        ...doc.toJSON(),
        userId: doc.userId.toHexString(),
        properties: {
          ...doc.properties,
          deviceId: doc.properties.deviceId.toHexString()
        }
      }

      return userLocation
    }, () => {
      cursor.close()
    })
  }
}
