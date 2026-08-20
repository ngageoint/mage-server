import { Feature, Point } from 'geojson'
import { MageEventId } from '../events/entities.events'
import { TeamId } from '../teams/entities.teams'
import { UserId } from '../users/entities.users'

export type LocationID = string

export const LocationsAddedEvent = 'Locations.Added' as const

export interface UserLocation extends Feature<Point, UserLocationProperties> {
  userId: UserId
  eventId: MageEventId
  /**
   * TODO: this comes from the mongoose model but nothing seems to reference
   * this in the server or web app. check mobile clients as well. maybe this
   * can be removed.
   */
  teamIds: TeamId[]
}

export interface UserLocationProperties {
  timestamp: Date
  deviceId?: string | null
  /**
   * Provider is the source that generated the location, e.g., `gps` for a
   * mobile phone's GPS.  This is device-dependent.
   */
  provider?: string
  altitude?: number
  accuracy?: number
  speed?: number,
  bearing?: number,
  battery_level?: number,
}

export interface UserLocationReadOptions {
  filter: {
    eventId?: MageEventId
    userId?: string
    startDate?: Date
    endDate?: Date
    lastLocationId?: string
  }
  /**
   * E.g.,
   */
  sort?: any
  limit?: number
  lean?: boolean
  stream?: false | null
}

export type UserLocationCreateAttrs = Omit<UserLocation, 'teamIds'> & {
  teamIds?: TeamId[]
}

export interface UserLocationRepository {
  createLocations(locations: UserLocationCreateAttrs[]): Promise<UserLocation[]>
  getLocations(options: UserLocationReadOptions): AsyncIterable<UserLocation> & { close?: () => void }
  removeLocationsForUser(userId: UserId): Promise<void>
}

export interface RecentUserLocations {
  userId: UserId
  eventId: MageEventId
  user?: any
  locations: UserLocation[]
}

export interface RecentUserLocationsReadOptions {
  filter: {
    eventId?: MageEventId
    startDate?: Date
    endDate?: Date
  }
  limit?: number
  populate?: boolean
}

export interface RecentUserLocationsRepository {
  addLocations(userId: UserId, eventId: MageEventId, locations: UserLocation[]): Promise<RecentUserLocations>
  findLocations(options: RecentUserLocationsReadOptions): Promise<RecentUserLocations[]>
  removeLocationsForUser(userId: UserId): Promise<void>
}
