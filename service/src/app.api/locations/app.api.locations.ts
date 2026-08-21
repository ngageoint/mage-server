import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { MageEvent } from '../../entities/events/entities.events'
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

export interface UserLocationRequestContext<Principal = UserWithRole> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
}

export interface UserLocationRequest<Principal = UserWithRole> extends AppRequest<Principal, UserLocationRequestContext<Principal>> {}

export interface ReadUserLocationsRequest extends UserLocationRequest {
  params: UserLocationQueryParams
}

export interface ReadUserLocations {
  (req: ReadUserLocationsRequest): Promise<AppResponse<PageOf<ExoUserLocation>, PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface ReadLocationsGroupedByUserRequest extends UserLocationRequest {
  params: RecentUserLocationQueryParams
}

export interface ReadLocationsGroupedByUser {
  (req: ReadLocationsGroupedByUserRequest): Promise<AppResponse<ExoRecentUserLocations[], PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface SaveUserLocationsRequest extends UserLocationRequest {}

export interface SaveUserLocations {
  (req: SaveUserLocationsRequest): Promise<AppResponse<ExoUserLocation[], PermissionDeniedError | EntityNotFoundError | InvalidInputError | InfrastructureError>>
}
export interface SaveUserLocationsRequest extends UserLocationRequest {
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
  iconUrl?: string
}


export type ExoRecentUserLocations = {
  id: UserId
  userId: UserId
  user?: ExoLocationUserLite,
  locations: ExoUserLocation[]
}

export interface UserLocationPermissionService {
  ensureCreateLocationPermission(context: UserLocationRequestContext): Promise<null | PermissionDeniedError>
  ensureReadLocationPermission(context: UserLocationRequestContext): Promise<null | PermissionDeniedError>
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
    iconUrl: from.icon?.relativePath ? `/api/users/${from.id}/icon` : undefined
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
