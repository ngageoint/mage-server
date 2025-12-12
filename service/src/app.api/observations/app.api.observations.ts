import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { Attachment, AttachmentId, copyObservationAttrs, EventScopedObservationRepository, FormEntry, FormFieldEntry, Observation, ObservationAttrs, ObservationFeatureProperties, ObservationId, ObservationImportantFlag, ObservationState, StagedAttachmentContentRef, Thumbnail, thumbnailIndexForTargetDimension } from '../../entities/observations/entities.observations'
import { MageEvent } from '../../entities/events/entities.events'
import _ from 'lodash'
import { User, UserId } from '../../entities/users/entities.users'



export interface ObservationRequestContext<Principal = unknown> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
  /**
   * TODO: This is obviously redundant with respect to `requestingPrincipal()`,
   * but that is in a transitional phase because that returns a Mongoose
   * `UserDocument` instead of a `User` entity.  `requestPrincipal()` should
   * probably be a user-device pair, eventually.
   */
  userId: UserId
  deviceId: string
  observationRepository: EventScopedObservationRepository
}
export interface ObservationRequest<Principal = unknown> extends AppRequest<Principal, ObservationRequestContext<Principal>> {}

export interface AllocateObservationId {
  (req: AllocateObservationIdRequest): Promise<AppResponse<ObservationId, PermissionDeniedError>>
}
export interface AllocateObservationIdRequest extends ObservationRequest {}

export interface SaveObservation {
  (req: SaveObservationRequest): Promise<AppResponse<ExoObservation, PermissionDeniedError | EntityNotFoundError | InvalidInputError>>
}
export interface SaveObservationRequest extends ObservationRequest {
  observation: ExoObservationMod
}

export interface StoreAttachmentContent {
  (req: StoreAttachmentContentRequest): Promise<AppResponse<ExoObservation, PermissionDeniedError | EntityNotFoundError | InvalidInputError | InfrastructureError>>
}
export interface StoreAttachmentContentRequest extends ObservationRequest {
  observationId: ObservationId
  attachmentId: AttachmentId
  content: ExoIncomingAttachmentContent
}

export interface ReadAttachmentContent {
  (req: ReadAttachmentContentRequest): Promise<AppResponse<ExoAttachmentContent, PermissionDeniedError | EntityNotFoundError | InfrastructureError>>
}
export interface ReadAttachmentContentRequest extends ObservationRequest {
  observationId: ObservationId
  attachmentId: AttachmentId
  minDimension?: number
  contentRange?: { start: number, end: number }
}

/**
 * ExoObservation refers to the view of observations that app clients receive
 * and send, the exo- prefix indicating the outermost, client-facing layer of
 * the application.
 */
export type ExoObservation = Omit<ObservationAttrs, 'attachments' | 'important' | 'states'> & {
  user?: ExoObservationUserLite
  important?: ExoObservationImportantFlag
  state?: ObservationState
  attachments: ExoAttachment[]
}

export type ExoAttachment = Omit<Attachment, 'thumbnails' | 'contentLocator'> & {
  contentStored: boolean
}

export interface ExoObservationImportantFlag extends ObservationImportantFlag {
  user?: ExoObservationUserLite
}

export type ExoObservationUserLite = Pick<User, 'id' | 'displayName'>

/**
 * `ExoObservationMod` defines the structure of an observation update object
 * that the application layer receives from the adapter layer, most commonly
 * the web layer.
 */
export type ExoObservationMod = Omit<ExoObservation, 'attachments' | 'createdAt' | 'deviceId' | 'eventId' | 'favoriteUserIds' | 'important' | 'lastModified' | 'properties' | 'state' | 'user' | 'userId'> & {
  properties: ExoObservationPropertiesMod
}

export type ExoObservationPropertiesMod = Omit<ObservationFeatureProperties, 'forms'> & {
  forms: ExoFormEntryMod[]
}

export type ExoFormEntryMod =
  & Partial<Pick<FormEntry, 'id'>>
  & Pick<FormEntry, 'formId'>
  & { [formFieldName: string]: FormFieldEntry | ExoAttachmentMod[] | undefined }

export type ExoAttachmentMod = Partial<ExoAttachment> & {
  /**
   * TODO: Ignore attachment mods without an action?
   */
  action?: AttachmentModAction
  id?: any
}

export enum AttachmentModAction {
  Add = 'add',
  Delete = 'delete',
}

export interface ExoIncomingAttachmentContent {
  bytes: StagedAttachmentContentRef | NodeJS.ReadableStream
  name: string
  mediaType: string
}

export interface ExoAttachmentContent {
  attachment: ExoAttachment
  bytes: NodeJS.ReadableStream
  bytesRange?: { start: number, end: number }
}

export function exoObservationFor(from: ObservationAttrs, users?: { creator?: User | null, importantFlagger?: User | null }): ExoObservation {
  const { states, ...attrs } = copyObservationAttrs(from)
  const attachments = attrs.attachments.map(x => exoAttachmentFor(x))
  users = users || {}
  return {
    ...attrs,
    attachments,
    user: from.userId === users.creator?.id ? exoObservationUserLiteFor(users.creator) : void(0),
    state: states ? states[0] : void(0),
    important: from.important ? {
      ...from.important,
      user: from.important.userId === users.importantFlagger?.id ? exoObservationUserLiteFor(users.importantFlagger) : void(0)
    } : void(0)
  }
}

export function exoAttachmentFor(from: Attachment): ExoAttachment {
  const { thumbnails, contentLocator, ...exo } = from
  return { ...exo, contentStored: !!contentLocator }
}

export function exoAttachmentForThumbnail(replacementThumbnailIndex: number, base: Attachment): ExoAttachment {
  const exoBase = exoAttachmentFor(base)
  const thumbnails = base.thumbnails
  const replacementThumb = thumbnails[replacementThumbnailIndex] || ({} as Partial<Thumbnail>)
  return {
    ...exoBase,
    contentType: replacementThumb.contentType,
    size: replacementThumb.size,
    width: replacementThumb.width,
    height: replacementThumb.height,
  }
}

export function exoAttachmentForThumbnailDimension(targetDimension: number, attachment: Attachment): ExoAttachment {
  const thumbPos = thumbnailIndexForTargetDimension(targetDimension, attachment)
  if (typeof thumbPos === 'number') {
    return exoAttachmentForThumbnail(thumbPos, attachment)
  }
  return exoAttachmentFor(attachment)
}

export function exoObservationUserLiteFor(from: User | null | undefined): ExoObservationUserLite | undefined {
  return from ? { id: from.id, displayName: from.displayName } : void(0)
}

export function domainObservationFor(from: ExoObservation): ObservationAttrs {
  return {
    ...from,
    states: [],
    attachments: from.attachments.map(domainAttachmentFor)
  }
}

export function domainAttachmentFor(from: ExoAttachment): Attachment {
  return {
    ...from,
    thumbnails: []
  }
}

export interface ObservationPermissionService {
  /**
   * Create permission applies when {@link AllocateObservationId | allocating}
   * new observation IDs, as well as saving a new observation.
   */
  ensureCreateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
  /**
   * Update permission applies when updating an existing observation.
   */
  ensureUpdateObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
  ensureStoreAttachmentContentPermission(context: ObservationRequestContext, observation: Observation, attachmentId: AttachmentId): Promise<null | PermissionDeniedError>
  ensureReadObservationPermission(context: ObservationRequestContext): Promise<null | PermissionDeniedError>
}
