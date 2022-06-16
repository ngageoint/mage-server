import { entityNotFound, invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import { AllocateObservationId, AllocateObservationIdRequest, ObservationPermissionService, SaveObservation, SaveObservationRequest, ExoObservation, exoObservationFor, ExoObservationMod, ObservationRequestContext, ExoAttachmentMod, ExoFormEntryMod, AttachmentModAction } from '../../app.api/observations/app.api.observations'
import { MageEvent } from '../../entities/events/entities.events'
import { FormFieldType } from '../../entities/events/entities.events.forms'
import { addAttachment, AttachmentCreateAttrs, FormEntry, FormEntryId, FormFieldEntry, Observation, ObservationAttrs, ObservationRepositoryErrorCode, removeAttachment, removeFormEntry, validationResultMessage } from '../../entities/observations/entities.observations'
import { UserId, UserRepository } from '../../entities/users/entities.users'

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

export function SaveObservation(permissionService: ObservationPermissionService, userRepo: UserRepository): SaveObservation {
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
      const userIds = { creator: saved.userId, importantFlagger: saved.important?.userId }
      const userIdsLookup = Object.values(userIds).filter(x => !!x) as UserId[]
      const usersFound = userIdsLookup.length ? await userRepo.findAllByIds(userIdsLookup) : {}
      const users = { creator: usersFound[userIds.creator || ''], importantFlagger: usersFound[userIds.importantFlagger || ''] }
      const exoObs: ExoObservation = exoObservationFor(saved, users)
      return AppResponse.success(exoObs)
    }
    switch (saved.code) {
      case ObservationRepositoryErrorCode.InvalidObservation:
        return AppResponse.error(invalidInput(validationResultMessage(obs.validation)))
      case ObservationRepositoryErrorCode.InvalidObservationId:
        return AppResponse.error(entityNotFound(obs.id, 'ObservationId'))
    }
  }
}

/**
 * TODO:
 * Much of this logic should move to resolve added and removed form entries and
 * attachments should move to {@link Observation.assignTo()} so that method can
 * generate appropriate domain events, but that will require some API changes
 * in the entity layer, i.e., some alternative to the pre-generated ID
 * requirements for new form entries and attachments.  That could be soemthing
 * like generating pending identifiers that are easily distinguished from
 * persistence layer identifiers; maybe a `PendingId` class or `Id` class with
 * an `isPending` property.  That should be reasonable to implement, but no
 * time now, as usual.
 */
async function prepareObservationMod(mod: ExoObservationMod, before: Observation | null, context: ObservationRequestContext): Promise<Observation | InvalidInputError> {
  const event = context.mageEvent
  const repo = context.observationRepository
  const modAttrs = baseObservationAttrsForMod(mod, before, context)
  // first get new form entry ids so new attachments have a proper id to reference
  const [ removedFormEntries, newFormEntries ] = mod.properties.forms.reduce(([ removed, added ], entryMod ) => {
    if (entryMod.id && before?.formEntryForId(entryMod.id)) {
      removed.delete(entryMod.id)
    }
    else {
      added.push(entryMod)
    }
    return [ removed, added ]
  }, [ new Map(before?.formEntries.map(x => [ x.id, x ]) || []), [] as ExoFormEntryMod[] ])
  const newFormEntryIds = newFormEntries.length ? await repo.nextFormEntryIds(newFormEntries.length) : []
  newFormEntries.forEach(x => x.id = newFormEntryIds.shift())
  const attachmentExtraction = extractAttachmentModsFromFormEntries(mod, event)
  modAttrs.properties.forms = attachmentExtraction.formEntries
  const attachmentMods = attachmentExtraction.attachmentMods
  const addCount = attachmentMods.reduce((count, x) => x.action === AttachmentModAction.Add ? count + 1 : count, 0)
  const attachmentIds = addCount ? await repo.nextAttachmentIds(addCount) : []
  const afterRemovedFormEntryAttachments = before?.attachments.reduce((obs, attachment) => {
    if (removedFormEntries.has(attachment.observationFormId)) {
      return removeAttachment(obs, attachment.id) as Observation
    }
    return obs
  }, before)
  if (afterRemovedFormEntryAttachments) {
    modAttrs.attachments = afterRemovedFormEntryAttachments.attachments
  }
  const afterFormEntriesRemoved = afterRemovedFormEntryAttachments ?
    Observation.assignTo(afterRemovedFormEntryAttachments, modAttrs) as Observation :
    Observation.evaluate(modAttrs, event)
  const afterAttachmentMods = attachmentMods.reduce<Observation | InvalidInputError>((obs, attachmentMod) => {
    if (obs instanceof MageError) {
      return obs
    }
    const mod =
      attachmentMod.action === AttachmentModAction.Add ?
        addAttachment(obs, attachmentIds.shift() as string, attachmentMod.fieldName, attachmentMod.formEntryId, attachmentCreateAttrsForMod(attachmentMod)) :
      attachmentMod.action === AttachmentModAction.Delete ?
        removeAttachment(obs, attachmentMod.id) :
      null
    if (mod instanceof Observation) {
      return mod
    }
    if (mod === null) {
      return invalidInput(`invalid attachment action: ${attachmentMod.action}`)
    }
    const message = `error adding attachment on observation ${obs.id}`
    return invalidInput(`${message}: ${String(mod)}`)
  }, afterFormEntriesRemoved)
  return afterAttachmentMods
}

/**
 * Return obsevation attributes for the given mod based on the optional
 * existing observation.  The result will not include form entries and
 * attachments, which require separate processing to resolve IDs and actions.
 * @param mod the modifications from an external client
 * @param before the observation to update, or null if none exists
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
    favoriteUserIds: before?.favoriteUserIds || [],
    important: before?.important,
    properties: {
      timestamp: mod.properties.timestamp,
      forms: []
    },
    attachments: [],
  }
}

type QualifiedAttachmentMod = ExoAttachmentMod & { fieldName: string, formEntryId: FormEntryId }

function extractAttachmentModsFromFormEntries(mod: ExoObservationMod, event: MageEvent): { formEntries: FormEntry[], attachmentMods: QualifiedAttachmentMod[] } {
  const allAttachmentMods = [] as QualifiedAttachmentMod[]
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
    allAttachmentMods.push(...attachmentMods)
    return formEntry
  })
  return { formEntries, attachmentMods: allAttachmentMods }
}

/**
 * Find the attachment modification entries in the given form entry, remove
 * them from the form entry.  Return the resulting form entry and the
 * extracted attachment mods.
 */
function extractAttachmentModsFromFormEntry(formEntryMod: ExoFormEntryMod, event: MageEvent): { formEntry: FormEntry, attachmentMods: QualifiedAttachmentMod[] } {
  const attachmentMods = [] as QualifiedAttachmentMod[]
  const { id, formId, ...fieldEntries } = formEntryMod as Required<ExoFormEntryMod>
  const formEntry = Object.entries(fieldEntries).reduce((formEntry, [ fieldName, fieldEntry ]) => {
    const field = event.formFieldFor(fieldName, formId)
    if (field?.type === FormFieldType.Attachment) {
      const attachmentModEntry = (fieldEntry || []) as ExoAttachmentMod[]
      attachmentModEntry.forEach(x => void(x.action && attachmentMods.push({ ...x, formEntryId: formEntry.id, fieldName })))
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
