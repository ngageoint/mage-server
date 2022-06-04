import Attachment from '../../api/attachment'
import { entityNotFound, invalidInput, permissionDenied, PermissionDeniedError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { AllocateObservationId, AllocateObservationIdRequest, ObservationPermissionService, SaveObservation, SaveObservationRequest, ExoObservation, exoObservationFor, domainObservationFor, ExoObservationMod, ObservationRequestContext, ExoAttachmentMod, ExoFormEntryMod } from '../../app.api/observations/app.api.observations'
import { FormFieldType } from '../../entities/events/entities.events.forms'
import { FormEntry, FormFieldEntry, Observation, ObservationAttrs, ObservationRepositoryErrorCode, validationResultMessage } from '../../entities/observations/entities.observations'

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
    const mod = req.observation
    const before = await repo.findById(mod.id)
    const newFormEntries = mod.properties.forms.filter(x => x.id && !before?.formEntryForId(x.id))
    const newFormEntryIds = newFormEntries.length ? await repo.nextFormEntryIds(newFormEntries.length) : []
    newFormEntries.forEach((x, index) => x.id = newFormEntryIds[index])
    const obsAttrs = observationAttrsForMod(mod, req.context, before)
    const obs = Observation.evaluate(obsAttrs, mageEvent)
    const saved = await repo.save(obs)
    if (saved instanceof Observation) {
      const userObs: ExoObservation = exoObservationFor(saved)
      return AppResponse.success(userObs)
    }
    switch (saved.code) {
      case ObservationRepositoryErrorCode.InvalidObservation:
        return AppResponse.error(invalidInput(validationResultMessage(obs.validation)))
      case ObservationRepositoryErrorCode.InvalidObservationId:
        return AppResponse.error(entityNotFound(obs.id, 'ObservationId'))
    }
  }
}

function observationAttrsForMod(mod: ExoObservationMod, context: ObservationRequestContext, before: Observation | null): ObservationAttrs {
  const event = context.mageEvent
  const attrs: ObservationAttrs = {
    id: mod.id,
    eventId: context.mageEvent.id,
    userId: before ? before.userId : context.userId,
    deviceId: before ? before.deviceId : context.deviceId,
    createdAt: before ? before.createdAt : new Date(),
    lastModified: new Date(),
    geometry: mod.geometry,
    type: 'Feature',
    states: before ? before.states : [],
    bbox: mod.bbox || before?.bbox,
    favoriteUserIds: before?.favoriteUserIds,
    importantFlag: before?.importantFlag,
    properties: {
      timestamp: mod.properties.timestamp,
      forms: []
    },
    attachments: [],
  }
  const attachmentMods = [] as ExoAttachmentMod[]
  attrs.properties.forms = mod.properties.forms.map(formEntry => {
    const { id, formId, ...fieldEntries } = formEntry as Required<ExoFormEntryMod>
    const form = event.formFor(formId)
    if (!form) {
      /*
      TODO: is this ok? the observation will not be validate and will not save,
      anyway, and this should never happen, except for rogue api clients.  seems
      fine for now ¯\_(ツ)_/¯
      */
      return { id, formId }
    }
    return Object.entries(fieldEntries).reduce((formEntry, [ fieldName, fieldEntry ]) => {
      const field = event.formFieldFor(fieldName, formId)
      if (field?.type === FormFieldType.Attachment) {
        attachmentMods.push(...fieldEntry as ExoAttachmentMod[])
      }
      else {
        formEntry[fieldName] = fieldEntry as FormFieldEntry
      }
      return formEntry
    }, { id, formId } as FormEntry)
  })
  return attrs
}
