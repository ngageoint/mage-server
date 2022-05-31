import { permissionDenied, PermissionDeniedError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { AllocateObservationId, AllocateObservationIdRequest, ObservationPermissionService, SaveObservation, SaveObservationRequest, UserObservation, userObservationFor } from '../../app.api/observations/app.api.observations'
import { Observation, ObservationAttrs } from '../../entities/observations/entities.observations'

export function AllocateObservationId(permissionService: ObservationPermissionService): AllocateObservationId {
  return async function allocateObservationId(req: AllocateObservationIdRequest): ReturnType<AllocateObservationId> {
    const denied = await permissionService.ensureCreateObservationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const repo = req.context.observationRepository
    const id = await repo.allocateObservationId()
    return AppResponse.success(id)
  }
}

export function SaveObservation(permissionService: ObservationPermissionService): SaveObservation {
  return async function saveObservation(req: SaveObservationRequest): ReturnType<SaveObservation> {
    const repo = req.context.observationRepository
    const mageEvent = req.context.mageEvent
    const obsAttrs: ObservationAttrs = { ...req.observation, eventId: mageEvent.id }
    const obs = Observation.evaluate(obsAttrs, mageEvent)
    const saved = await repo.save(obs)
    if (saved instanceof Observation) {
      const userObs: UserObservation = userObservationFor(saved)
      return AppResponse.success(userObs)
    }
    return AppResponse.error(permissionDenied('save observation', String(req.context.requestingPrincipal())))
  }
}