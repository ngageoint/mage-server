import EventEmitter from 'events'
import { entityNotFound, infrastructureError, invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/observations/app.api.observations'
import { MageEvent } from '../../entities/events/entities.events'
import { FormFieldType } from '../../entities/events/entities.events.forms'
import { addAttachment, AttachmentCreateAttrs, AttachmentNotFoundError, AttachmentsRemovedDomainEvent, AttachmentStore, AttachmentStoreError, AttachmentStoreErrorCode, FormEntry, FormEntryId, FormFieldEntry, Observation, ObservationAttrs, ObservationDomainEventType, ObservationEmitted, ObservationRepositoryErrorCode, removeAttachment, thumbnailIndexForTargetDimension, validationResultMessage } from '../../entities/observations/entities.observations'
import { UserId, UserRepository } from '../../entities/users/entities.users'

export function AllocateObservationId(permissionService: api.ObservationPermissionService): api.AllocateObservationId {
  return async function allocateObservationId(req: api.AllocateObservationIdRequest): ReturnType<api.AllocateObservationId> {
    const denied = await permissionService.ensureCreateObservationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const repo = req.context.observationRepository
    const id = await repo.allocateObservationId()
    return AppResponse.success(id)
  }
}

export function SaveObservation(permissionService: api.ObservationPermissionService, userRepo: UserRepository): api.SaveObservation {
  return async function saveObservation(req: api.SaveObservationRequest): ReturnType<api.SaveObservation> {
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
      const exoObs: api.ExoObservation = api.exoObservationFor(saved, users)
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

export function StoreAttachmentContent(permissionService: api.ObservationPermissionService, attachmentStore: AttachmentStore): api.StoreAttachmentContent {
  return async function storeAttachmentContent(req: api.StoreAttachmentContentRequest): ReturnType<api.StoreAttachmentContent> {
    const obsRepo = req.context.observationRepository
    const obsBefore = await obsRepo.findById(req.observationId)
    if (!obsBefore) {
      return AppResponse.error(entityNotFound(req.observationId, 'Observation'))
    }
    const attachmentBefore = obsBefore.attachmentFor(req.attachmentId)
    if (!attachmentBefore) {
      return AppResponse.error(entityNotFound(req.attachmentId, 'Attachment'))
    }
    const content = req.content
    if (content.mediaType !== attachmentBefore.contentType || content.name !== attachmentBefore.name) {
      const errorMessage = `attachment upload error - uploaded content name and media type ${content.name}|${content.mediaType} must match attachment ${attachmentBefore.name}|${attachmentBefore.contentType}`
      return AppResponse.error(invalidInput(errorMessage))
    }
    const denied = await permissionService.ensureStoreAttachmentContentPermission(req.context, obsBefore, attachmentBefore.id)
    if (denied) {
      return AppResponse.error(denied)
    }
    const attachmentPatch = await attachmentStore.saveContent(req.content.bytes, attachmentBefore.id, obsBefore)
    if (attachmentPatch instanceof AttachmentStoreError) {
      if (attachmentPatch.errorCode === AttachmentStoreErrorCode.StorageError) {
        return AppResponse.error(infrastructureError(attachmentPatch))
      }
      return AppResponse.error(invalidInput(attachmentPatch.message))
    }
    if (attachmentPatch === null) {
      return AppResponse.success(api.exoObservationFor(obsBefore))
    }
    const obsAfterSave = await obsRepo.patchAttachment(obsBefore, attachmentBefore.id, attachmentPatch)
    if (obsAfterSave instanceof Observation) {
      return AppResponse.success(api.exoObservationFor(obsAfterSave))
    }
    if (obsAfterSave instanceof AttachmentNotFoundError) {
      // should not happen, except if the observation was updated by another client ¯\_(ツ)_/¯
      return AppResponse.error(invalidInput(obsAfterSave.message))
    }
    // the observation was deleted by another client ¯\_(ツ)_/¯
    return AppResponse.error(entityNotFound(obsBefore.id, 'Observation'))
  }
}

export function ReadAttachmentContent(permissionService: api.ObservationPermissionService, attachmentStore: AttachmentStore): api.ReadAttachmentContent {
  return async function readAttachmentContent(req: api.ReadAttachmentContentRequest): ReturnType<api.ReadAttachmentContent> {
    const denied = await permissionService.ensureReadObservationPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const repo = req.context.observationRepository
    const obs = await repo.findById(req.observationId)
    if (!obs) {
      return AppResponse.error(entityNotFound(req.observationId, 'Observation'))
    }
    const attachment = await obs.attachmentFor(req.attachmentId)
    if (!attachment) {
      return AppResponse.error(entityNotFound(req.attachmentId, 'Attachment'))
    }
    const contentRange = typeof req.contentRange?.start === 'number' && typeof req.contentRange.end === 'number' ?
      { start: req.contentRange.start, end: req.contentRange.end } : void(0)
    let contentStream: NodeJS.ReadableStream | null | AttachmentStoreError = null
    let exoAttachment: api.ExoAttachment = api.exoAttachmentFor(attachment)
    if (typeof req.minDimension === 'number') {
      const thumbIndex =  thumbnailIndexForTargetDimension(req.minDimension, attachment)
      const thumb = attachment.thumbnails[Number(thumbIndex)]
      if (thumb) {
        contentStream = await attachmentStore.readThumbnailContent(thumb.minDimension, attachment.id, obs)
        exoAttachment = api.exoAttachmentForThumbnail(thumbIndex!, attachment)
      }
      if (!contentStream) {
        contentStream = await attachmentStore.readContent(attachment.id, obs)
        exoAttachment = api.exoAttachmentFor(attachment)
      }
    }
    else {
      contentStream = await attachmentStore.readContent(attachment.id, obs, contentRange)
    }
    if (!contentStream) {
      return AppResponse.error(entityNotFound(req.attachmentId, 'AttachmentContent'))
    }
    if (contentStream instanceof AttachmentStoreError) {
      return AppResponse.error(infrastructureError(contentStream.message))
    }
    return AppResponse.success({
      attachment: exoAttachment,
      bytes: contentStream,
      bytesRange: typeof req.minDimension === 'number' ? void(0) : contentRange
    })
  }
}

export function registerDeleteRemovedAttachmentsHandler(domainEvents: EventEmitter, attachmentStore: AttachmentStore): void {
  domainEvents.on(ObservationDomainEventType.AttachmentsRemoved, (e: ObservationEmitted<AttachmentsRemovedDomainEvent>) => {
    setTimeout(async () => {
      const attachments = e.removedAttachments
      for (const att of attachments) {
        console.info(`deleting removed attachment content ${att.id} from observation ${e.observation.id}`)
        attachmentStore.deleteContent(att, e.observation).catch(err => {
          console.error(`error deleting content of attachment ${att.id} on observation ${e.observation.id}:`, err)
        })
      }
    })
  })
}

/**
 * TODO:
 * Much of this logic to resolve added and removed form entries and
 * attachments should move to {@link Observation.assignTo()} so that method can
 * generate appropriate domain events, but that will require some API changes
 * in the entity layer, i.e., some alternative to the pre-generated ID
 * requirements for new form entries and attachments.  That could be soemthing
 * like generating pending identifiers that are easily distinguished from
 * persistence layer identifiers; maybe a `PendingId` class or `Id` class with
 * an `isPending` property.  That should be reasonable to implement, but no
 * time now, as usual.
 */
async function prepareObservationMod(mod: api.ExoObservationMod, before: Observation | null, context: api.ObservationRequestContext): Promise<Observation | InvalidInputError> {
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
  }, [ new Map(before?.formEntries.map(x => [ x.id, x ]) || []), [] as api.ExoFormEntryMod[] ])
  const newFormEntryIds = newFormEntries.length ? await repo.nextFormEntryIds(newFormEntries.length) : []
  newFormEntries.forEach(x => x.id = newFormEntryIds.shift())
  const attachmentExtraction = extractAttachmentModsFromFormEntries(mod, event)
  modAttrs.properties.forms = attachmentExtraction.formEntries
  const attachmentMods = attachmentExtraction.attachmentMods
  const addCount = attachmentMods.reduce((count, x) => x.action === api.AttachmentModAction.Add ? count + 1 : count, 0)
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
      attachmentMod.action === api.AttachmentModAction.Add ?
        addAttachment(obs, attachmentIds.shift() as string, attachmentMod.fieldName, attachmentMod.formEntryId, attachmentCreateAttrsForMod(attachmentMod)) :
      attachmentMod.action === api.AttachmentModAction.Delete ?
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
function baseObservationAttrsForMod(mod: api.ExoObservationMod, before: Observation | null, context: api.ObservationRequestContext): ObservationAttrs {
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
    favoriteUserIds: before?.favoriteUserIds || [],
    important: before?.important,
    properties: {
      // TODO: should timestamp be optional on the mod object?
      timestamp: mod.properties.timestamp,
      forms: []
    },
    attachments: [],
  }
  assignFirstDefined('accuracy', attrs.properties, mod.properties, before?.properties)
  assignFirstDefined('delta', attrs.properties, mod.properties, before?.properties)
  assignFirstDefined('provider', attrs.properties, mod.properties, before?.properties)
  return attrs
}

function assignFirstDefined<T>(key: keyof T, target: T, ...sources: (T | undefined)[]): T {
  const source = sources.find(source => source && source[key] !== undefined)
  if (source) {
    target[key] = source[key]
  }
  return target
}

type QualifiedAttachmentMod = api.ExoAttachmentMod & { fieldName: string, formEntryId: FormEntryId }

function extractAttachmentModsFromFormEntries(mod: api.ExoObservationMod, event: MageEvent): { formEntries: FormEntry[], attachmentMods: QualifiedAttachmentMod[] } {
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
function extractAttachmentModsFromFormEntry(formEntryMod: api.ExoFormEntryMod, event: MageEvent): { formEntry: FormEntry, attachmentMods: QualifiedAttachmentMod[] } {
  const attachmentMods = [] as QualifiedAttachmentMod[]
  const { id, formId, ...fieldEntries } = formEntryMod as Required<api.ExoFormEntryMod>
  const formEntry = Object.entries(fieldEntries).reduce((formEntry, [ fieldName, fieldEntry ]) => {
    const field = event.formFieldFor(fieldName, formId)
    if (field?.type === FormFieldType.Attachment) {
      const attachmentModEntry = (fieldEntry || []) as api.ExoAttachmentMod[]
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

function attachmentCreateAttrsForMod(mod: api.ExoAttachmentMod): AttachmentCreateAttrs {
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
