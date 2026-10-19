import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppResponse } from '../app.api.global'
import { EventRequest, EventRequestContext } from '../events/app.api.events'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { User, UserId } from '../../entities/users/entities.users'
import { TeamId } from '../../entities/teams/entities.teams'
import { Point } from 'geojson'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { LocationUserExpanded, RecentUserLocations, UserLocation } from '../../entities/locations/entities.locations'

export type CommonUserLocationQueryParams = {
  startDate?: Date
  endDate?: Date
  userIsAnyOf?: UserId[]
  teamIsAnyOf?: TeamId[]
}

export type UserLocationQueryParams = {
  paging?: PagingParameters
} & CommonUserLocationQueryParams

export type RecentUserLocationQueryParams = {
  limit?: number
  populate?: boolean
} & CommonUserLocationQueryParams

export interface ReadUserLocationsRequest extends EventRequest<UserWithRole> {
  params: UserLocationQueryParams
}

export interface ReadUserLocations {
  (req: ReadUserLocationsRequest): Promise<AppResponse<PageOf<ExoUserLocation>, PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface ReadLocationsGroupedByUserRequest extends EventRequest<UserWithRole> {
  params: RecentUserLocationQueryParams
}

export interface ReadLocationsGroupedByUser {
  (req: ReadLocationsGroupedByUserRequest): Promise<AppResponse<ExoRecentUserLocations[], PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface SaveUserLocationsRequest extends EventRequest<UserWithRole> {}

export interface SaveUserLocations {
  (req: SaveUserLocationsRequest): Promise<AppResponse<ExoUserLocation[], PermissionDeniedError | EntityNotFoundError | InvalidInputError | InfrastructureError>>
}
export interface SaveUserLocationsRequest extends EventRequest<UserWithRole> {
  locations: ExoUserLocation[]
}

export type ExoUserLocation = {
  type: 'Feature'
  geometry: Point
  properties: {
    timestamp: Date
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type ExoLocationUserLite = Pick<User, 'id' | 'displayName'> & {
  hasIcon: boolean
}


export type ExoRecentUserLocations = {
  id: UserId
  userId: UserId
  user?: ExoLocationUserLite,
  locations: ExoUserLocation[]
}

export interface UserLocationPermissionService {
  ensureCreateLocationPermission(context: EventRequestContext<UserWithRole>): Promise<null | PermissionDeniedError>
  ensureReadLocationPermission(context: EventRequestContext<UserWithRole>): Promise<null | PermissionDeniedError>
}

export function ExoUserLocationFor(from: UserLocation): ExoUserLocation {
  return {
    ...from,
    properties: { ...from.properties }
  }
}

export function exoLocationUserFor(from: LocationUserExpanded | undefined): ExoLocationUserLite | undefined {
  if (!from) {
    return undefined
  }

  return {
    id: from.id,
    displayName: from.displayName,
    hasIcon: typeof from.icon?.relativePath === 'string'
  }
}

export function ExoRecentUserLocationsFor(from: RecentUserLocations): ExoRecentUserLocations {
  return {
    id: from.userId,
    userId: from.userId,
    user: exoLocationUserFor(from.user),
    locations: from.locations.map(ExoUserLocationFor)
  }
}
