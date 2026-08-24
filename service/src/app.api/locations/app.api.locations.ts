import { Point } from 'geojson'
import { MageEvent } from '../../entities/events/entities.events'
import { RecentUserLocations, UserLocation, UserLocationProperties } from '../../entities/locations/entities.locations'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { InvalidInputError, PermissionDeniedError } from '../app.api.errors'

export interface LocationRequestContext<Principal = UserWithRole> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
}

export interface LocationRequest<Principal = UserWithRole> extends AppRequest<Principal, LocationRequestContext<Principal>> {}

export interface LocationCreateParams {
  geometry: Point
  properties: UserLocationProperties
}

export interface CreateLocationsRequest<Principal = UserWithRole> extends LocationRequest<Principal> {
  locations: LocationCreateParams[]
}

export interface CreateLocations {
  (req: CreateLocationsRequest): Promise<AppResponse<UserLocation[], PermissionDeniedError | InvalidInputError>>
}

export interface ReadLocationsRequest<Principal = UserWithRole> extends LocationRequest<Principal> {
  startDate?: Date
  endDate?: Date
  lastLocationId?: string
  limit?: number
}

export interface ReadLocations {
  (req: ReadLocationsRequest): Promise<AppResponse<UserLocation[], PermissionDeniedError>>
}

export interface ReadLocationsGroupedByUserRequest<Principal = UserWithRole> extends LocationRequest<Principal> {
  startDate?: Date
  endDate?: Date
  limit?: number
  populate?: boolean
}

export interface ReadLocationsGroupedByUser {
  (req: ReadLocationsGroupedByUserRequest): Promise<AppResponse<RecentUserLocations[], PermissionDeniedError>>
}

export interface LocationPermissionService {
  ensureCreateLocationsPermission(context: LocationRequestContext): Promise<null | PermissionDeniedError>
  ensureReadLocationsPermission(context: LocationRequestContext): Promise<null | PermissionDeniedError>
}
