import EventEmitter from 'events'
import { infrastructureError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/locations/app.api.locations'
import { TeamRepository } from '../../entities/teams/entities.teams'
import { resolveUserIsAnyOf } from '../teams/app.impl.teams'
import { FindRecentUserLocationsSpec, RecentUserLocationsRepository, UserLocationDomainEventType, UserLocationRepository } from '../../entities/locations/entities.locations'

export function ReadAllUserLocations(
  permissionService: api.UserLocationPermissionService,
  teamRepo: TeamRepository,
  repo: UserLocationRepository,
): api.ReadUserLocations {
  return async function readUserLocations(req: api.ReadUserLocationsRequest) {
    const denied = await permissionService.ensureReadLocationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    const event = req.context.mageEvent
    const params = req.params
    try {
      const userIsAnyOf = await resolveUserIsAnyOf(teamRepo, params.userIsAnyOf, params.teamIsAnyOf)

      const findSpec = {
        where: {
          eventId: event.id,
          timestampAfter: params.startDate,
          timestampBefore: params.endDate,
          userIsAnyOf
        },
        paging: params.paging
      }

      const result = await repo.getUserLocations(findSpec)
      const page = { ...result, items: result.items.map(api.ExoUserLocationFor) }

      return AppResponse.success(page)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function ReadLocationsGroupedByUser(
  permissionService: api.UserLocationPermissionService,
  teamRepo: TeamRepository,
  recentLocationRepo: RecentUserLocationsRepository
): api.ReadLocationsGroupedByUser {
  return async function readLocationsGroupedByUser(req: api.ReadLocationsGroupedByUserRequest): ReturnType<api.ReadLocationsGroupedByUser> {
    const denied = await permissionService.ensureReadLocationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    const params = req.params

    const userIsAnyOf = await resolveUserIsAnyOf(teamRepo, params.userIsAnyOf, params.teamIsAnyOf)

    const spec: FindRecentUserLocationsSpec = {
      where: {
        eventId: req.context.mageEvent.id,
        timestampAfter: params.startDate,
        timestampBefore: params.endDate,
        userIsAnyOf
      },
      limit: params.limit,
      populate: params.populate
    }

    try {
      const locations = await recentLocationRepo.findLocations(spec)
      return AppResponse.success(locations.map(api.ExoRecentUserLocationsFor))
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function SaveUserLocations(
  permissionService: api.UserLocationPermissionService,
  userLocationRepo: UserLocationRepository,
  recentUserLocationRepo: RecentUserLocationsRepository,
  domainEvents: EventEmitter
): api.SaveUserLocations {
  return async function saveUserLocations(req: api.SaveUserLocationsRequest): ReturnType<api.SaveUserLocations> {
    const denied = await permissionService.ensureCreateLocationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }

    const eventId = req.context.mageEvent.id
    const userId = req.context.requestingPrincipal().id
    const userLocations = req.locations.map(location => {
      return {
        ...location,
        eventId,
        userId,
      }
    })

    try {
      const saved = await userLocationRepo.save(userLocations)
      await recentUserLocationRepo.addLocations({
        eventId,
        userId,
        locations: userLocations
      })

      domainEvents.emit(UserLocationDomainEventType.LocationSaved, Object.freeze({
        type: UserLocationDomainEventType.LocationSaved,
        locations: saved
      }))

      return AppResponse.success(saved.map(api.ExoUserLocationFor))
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}
