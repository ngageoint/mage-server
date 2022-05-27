import { permissionDenied, PermissionDeniedError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { AllocateObservationId, AllocateObservationIdRequest, ObservationPermissionService, SaveObservation, SaveObservationRequest } from '../../app.api/observations/app.api.observations'

export function AllocateObservationId(permissionService: ObservationPermissionService): AllocateObservationId {
  return async function allocateObservationId(req: AllocateObservationIdRequest): ReturnType<AllocateObservationId> {
    const denied = await permissionService.ensureCreateObservationPermission(req.context)
    if (denied) {
      return AppResponse.error<any, PermissionDeniedError>(denied)
    }
    const repo = req.context.observationRepository
    const id = await repo.allocateObservationId()
    return AppResponse.success(id)
  }
}

export function SaveObservation(permissionService: ObservationPermissionService): SaveObservation {
  return async function saveObservation(req: SaveObservationRequest): ReturnType<SaveObservation> {
    return AppResponse.error<any, PermissionDeniedError>(permissionDenied('save observation', String(req.context.requestingPrincipal())))
  }
}