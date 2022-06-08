import Attachment from '../../api/attachment'
import { entityNotFound, invalidInput, InvalidInputError, MageError, permissionDenied, PermissionDeniedError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { AllocateObservationId, AllocateObservationIdRequest, ObservationPermissionService, SaveObservation, SaveObservationRequest, ExoObservation, exoObservationFor, domainObservationFor, ExoObservationMod, ObservationRequestContext, ExoAttachmentMod, ExoFormEntryMod, AttachmentModAction } from '../../app.api/observations/app.api.observations'
import { MageEvent } from '../../entities/events/entities.events'
import { FormFieldType } from '../../entities/events/entities.events.forms'
import { addAttachment, AttachmentAddError, AttachmentCreateAttrs, copyAttachmentAttrs, FormEntry, FormEntryId, FormFieldEntry, Observation, ObservationAttrs, ObservationRepositoryErrorCode, validationResultMessage } from '../../entities/observations/entities.observations'

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
    const mod = req.observation
    const before = await repo.findById(mod.id)
    const denied = before ?
       await permissionService.ensureUpdateObservationPermission(req.context) :
       await permissionService.ensureCreateObservationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const obs = await prepareObservationMod(mod, before, req.context)
    if (obs instanceof MageError) {
      return AppResponse.error(obs)
    }
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

async function prepareObservationMod(mod: ExoObservationMod, before: Observation | null, context: ObservationRequestContext): Promise<Observation | InvalidInputError> {
  const event = context.mageEvent
  const repo = context.observationRepository
  const attrs = baseObservationAttrsForMod(mod, before, context)
  // first get new form entry ids so new attachments have a proper id to reference
  const newFormEntries = mod.properties.forms.filter(x => x.id && !before?.formEntryForId(x.id))
  const newFormEntryIds = newFormEntries.length ? await repo.nextFormEntryIds(newFormEntries.length) : []
  newFormEntries.forEach((x, index) => x.id = newFormEntryIds[index])
  const attachmentExtraction = extractAttachmentModsFromFormEntries(mod, event)
  attrs.properties.forms = attachmentExtraction.formEntries
  const attachmentsToAdd = attachmentExtraction.attachmentMods[AttachmentModAction.Add]
  const attachmentIds = attachmentsToAdd.length ? await repo.nextAttachmentIds(attachmentsToAdd.length) : []
  const obs = attachmentsToAdd.reduce<Observation | InvalidInputError>((obs, attachmentMod, index) => {
    if (obs instanceof MageError) {
      return obs
    }
    const added = addAttachment(obs, attachmentIds[index], attachmentMod.fieldName, attachmentMod.formEntryId, attachmentCreateAttrsForMod(attachmentMod))
    if (added instanceof Observation) {
      return added
    }
    const message = `error adding attachment on observation ${obs.id}`
    console.error(message, added)
    return invalidInput(`${message}: ${String(added)}`)
  }, Observation.evaluate(attrs, event))
  return obs
}

/**
 * Return obsevation attributes for the given mod based on the optional
 * existing observation.  The result will not include form entries and
 * attachments, which require separate processing to resolve IDs and actions.
 * @param mod
 * @param before
 */
function baseObservationAttrsForMod(mod: ExoObservationMod, before: Observation | null, context: ObservationRequestContext): ObservationAttrs {
  return {
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
    attachments: before?.attachments || [],
  }
}

type ExtractedAttachmentMods = {
  [AttachmentModAction.Add]: QualifiedAttachmentMod[]
  [AttachmentModAction.Delete]: QualifiedAttachmentMod[]
}
type QualifiedAttachmentMod = ExoAttachmentMod & { fieldName: string, formEntryId: FormEntryId }

function extractAttachmentModsFromFormEntries(mod: ExoObservationMod, event: MageEvent): { formEntries: FormEntry[], attachmentMods: ExtractedAttachmentMods } {
  const allAttachmentMods = {
    [AttachmentModAction.Add]: [],
    [AttachmentModAction.Delete]: []
  } as ExtractedAttachmentMods
  const formEntries = mod.properties.forms.map(formEntryMod => {
    const form = event.formFor(formEntryMod.formId)
    if (!form) {
      /*
      TODO: is this ok? the observation will not be valid and will not save
      because of the invalid form reference anyway, and this should never
      happen, except for rogue api clients.  seems fine for now ¯\_(ツ)_/¯
      */
      return { id: formEntryMod.id || '', formId: formEntryMod.formId }
    }
    const { formEntry, attachmentMods } = extractAttachmentModsFromFormEntry(formEntryMod, event)
    allAttachmentMods[AttachmentModAction.Add].push(...attachmentMods[AttachmentModAction.Add])
    allAttachmentMods[AttachmentModAction.Delete].push(...attachmentMods[AttachmentModAction.Delete])
    return formEntry
  })
  return { formEntries, attachmentMods: allAttachmentMods }
}

/**
 * Find the attachment modification entries in the given form entry, remove
 * them from the form entry.  Return the resulting form entry and the
 * extracted attachment mods.
 */
function extractAttachmentModsFromFormEntry(formEntryMod: ExoFormEntryMod, event: MageEvent): { formEntry: FormEntry, attachmentMods: ExtractedAttachmentMods } {
  const attachmentMods = {
    [AttachmentModAction.Add]: [],
    [AttachmentModAction.Delete]: []
  } as ExtractedAttachmentMods
  const { id, formId, ...fieldEntries } = formEntryMod as Required<ExoFormEntryMod>
  const formEntry = Object.entries(fieldEntries).reduce((formEntry, [ fieldName, fieldEntry ]) => {
    const field = event.formFieldFor(fieldName, formId)
    if (field?.type === FormFieldType.Attachment) {
      const attachmentModEntry = (fieldEntry || []) as ExoAttachmentMod[]
      attachmentModEntry.forEach(x => void(x.action && attachmentMods[x.action].push({ ...x, formEntryId: formEntry.id, fieldName })))
    }
    else {
      // let it be invalid
      formEntry[fieldName] = fieldEntry as FormFieldEntry
    }
    return formEntry
  }, { id, formId } as FormEntry)
  return { formEntry, attachmentMods }
}

function attachmentCreateAttrsForMod(mod: ExoAttachmentMod): AttachmentCreateAttrs {
  return {
    contentType: mod.contentType,
    name: mod.name,
    size: mod.size,
    width: mod.width,
    height: mod.height,
    oriented: mod.oriented || false,
    thumbnails: [],
  }
}
