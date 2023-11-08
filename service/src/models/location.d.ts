import mongoose from 'mongoose'
import { MageEventId } from '../entities/events/entities.events'
import { UserLocation, UserLocationProperties } from '../entities/locations/entities.locations'


export type UserLocationDocument = mongoose.Document & Omit<UserLocation, 'eventId' | 'userId' | 'properties'> & {
  eventId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  properties: UserLocationDocumentProperties
}

export type UserLocationDocumentProperties = Omit<UserLocationProperties, 'deviceId'> & {
  deviceId: mongoose.Types.ObjectId
}

export type UserLocationModel = mongoose.Model<UserLocationDocument>

export interface UserLocationReadOptions {
  filter: {
    eventId?: MageEventId
    userId?: mongoose.Types.ObjectId
    startDate?: Date
    endDate?: Date
    lastLocationId?: mongoose.Types.ObjectId
  }
  /**
   * E.g.,
   */
  sort?: any
  limit?: number
  lean?: boolean
  stream?: false | null
}

export type UserLocationReadStreamOptions = Omit<UserLocationReadOptions, 'stream'> & {
  stream: true
}

export function getLocations(options: UserLocationReadOptions, callback: (err: any | null, results?: UserLocationDocument[]) => any): void
export function getLocations(options: UserLocationReadStreamOptions): mongoose.QueryCursor<UserLocationDocument>
