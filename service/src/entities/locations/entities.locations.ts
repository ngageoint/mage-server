import { Feature, Point } from 'geojson'
import { MageEventId } from '../events/entities.events'
import { PageOf, PagingParameters } from '../entities.global'
import { UserIcon, UserId } from '../users/entities.users'

export type UserLocationId = string

export interface UserLocation extends Feature<Point, UserLocationProperties> {
  userId: UserId
  eventId: MageEventId
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

export type FindUserLocationsSortField = 'timestamp'

export interface FindUserLocationsSort {
  /**
   * The default sort field is `lastModified`.
   */
  field: FindUserLocationsSortField
  /**
   * `1` indicates ascending, `-1` indicates descending.  Ascending is the default order.
   */
  order?: 1 | -1
}

export type FindLocationsWhere = {
  eventId: MageEventId
  timestampAfter?: Date
  timestampBefore?: Date
  userIsAnyOf?: UserId[]
}

export type FindUserLocationsSpec = { where: FindLocationsWhere, orderBy?: FindUserLocationsSort, paging?: PagingParameters }

export type FindUserLocationsStreamSpec = {
  where: FindLocationsWhere
}

export interface UserLocationRepository {
  save(locations: UserLocation[]): Promise<UserLocation[]>
  getUserLocations(findSpec: FindUserLocationsSpec): Promise<PageOf<UserLocation>>
  iterate(spec: FindUserLocationsStreamSpec): AsyncIterable<UserLocation> & { close?: () => void }
  deleteLocationsForUser(userId: UserId): Promise<void>
}

export type LocationUserExpanded = {
  id: UserId
  displayName: string
  icon?: UserIcon
}

export interface RecentUserLocations {
  userId: UserId
  eventId: MageEventId
  locations: UserLocation[]
  user?: LocationUserExpanded
}

export type AddRecentUserLocationsSpec = {
  userId: UserId
  eventId: MageEventId
  locations: UserLocation[]
}

export type FindRecentUserLocationsSpec = {
  where: {
    eventId: MageEventId
    timestampAfter?: Date
    timestampBefore?: Date,
    userIsAnyOf?: UserId[]
  }
  limit?: number
  populate?: boolean
}

export enum UserLocationDomainEventType {
  LocationSaved = 'Location.Saved',
}

export type UserLocationSavedDomainEvent = {
  readonly type: UserLocationDomainEventType.LocationSaved
  /**
   * Snapshot of the locations immediately after the save operation that
   * triggered this event.
   */
  readonly locations: UserLocation[]
}

export interface RecentUserLocationsRepository {
  addLocations(spec: AddRecentUserLocationsSpec): Promise<RecentUserLocations>
  findLocations(spec: FindRecentUserLocationsSpec): Promise<RecentUserLocations[]>
  deleteLocationsForUser(userId: UserId): Promise<void>
}
