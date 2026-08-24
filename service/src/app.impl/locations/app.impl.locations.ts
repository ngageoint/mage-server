import { EventEmitter } from 'events'
import * as api from '../../app.api/locations/app.api.locations'
import { KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import { invalidInput } from '../../app.api/app.api.errors'
import { LocationsAddedEvent, RecentUserLocationsRepository, UserLocation, UserLocationRepository } from '../../entities/locations/entities.locations'

export function CreateLocations(
  repo: UserLocationRepository,
  recentRepo: RecentUserLocationsRepository,
  permissionService: api.LocationPermissionService,
  domainEvents: EventEmitter
): api.CreateLocations {
  return async function createLocations(req: api.CreateLocationsRequest): ReturnType<api.CreateLocations> {
    return await withPermission<UserLocation[], KnownErrorsOf<api.CreateLocations>>(
      permissionService.ensureCreateLocationsPermission(req.context),
      async () => {
        for (const location of req.locations) {
          if (!location.geometry) {
            return invalidInput("Missing required parameter 'geometry'.")
          }
          if (!location.properties?.timestamp) {
            return invalidInput("Missing required parameter 'properties.timestamp'")
          }
        }

        const user = req.context.requestingPrincipal()
        const event = req.context.mageEvent
        const locations: Omit<UserLocation, 'id'>[] = req.locations.map(location => ({
          type: 'Feature',
          eventId: event.id,
          userId: user.id,
          teamIds: [],
          geometry: location.geometry,
          properties: location.properties
        }))

        const created = await repo.createLocations(locations)
        await recentRepo.addLocations(user.id, event.id, created)
        domainEvents.emit(LocationsAddedEvent, created, user, event)
        return created
      }
    )
  }
}

export function ReadLocations(
  repo: UserLocationRepository,
  permissionService: api.LocationPermissionService
): api.ReadLocations {
  return async function readLocations(req: api.ReadLocationsRequest): ReturnType<api.ReadLocations> {
    return await withPermission<UserLocation[], KnownErrorsOf<api.ReadLocations>>(
      permissionService.ensureReadLocationsPermission(req.context),
      async () => {
        const cursor = repo.getLocations({
          filter: {
            eventId: req.context.mageEvent.id,
            startDate: req.startDate,
            endDate: req.endDate,
            lastLocationId: req.lastLocationId
          },
          limit: req.limit
        })
        const locations: UserLocation[] = []
        for await (const location of cursor) {
          locations.push(location)
        }
        return locations
      }
    )
  }
}

export function ReadLocationsGroupedByUser(
  recentRepo: RecentUserLocationsRepository,
  permissionService: api.LocationPermissionService
): api.ReadLocationsGroupedByUser {
  return async function readLocationsGroupedByUser(req: api.ReadLocationsGroupedByUserRequest): ReturnType<api.ReadLocationsGroupedByUser> {
    return await withPermission(
      permissionService.ensureReadLocationsPermission(req.context),
      async () => {
        return await recentRepo.findLocations({
          filter: {
            eventId: req.context.mageEvent.id,
            startDate: req.startDate,
            endDate: req.endDate
          },
          limit: req.limit,
          populate: req.populate
        })
      }
    )
  }
}
