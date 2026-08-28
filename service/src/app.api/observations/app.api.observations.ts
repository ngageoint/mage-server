import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { Attachment, AttachmentId, Condition, copyObservationAttrs, EventScopedObservationRepository, FindObservationsSort, FindObservationsStreamSpec, FormEntry, FormFieldEntry, Observation, ObservationAttrs, ObservationFeatureProperties, ObservationFieldFilter, ObservationId, ObservationImportantFlag, ObservationState, ObservationUserExpanded, StagedAttachmentContentRef, Thumbnail, thumbnailIndexForTargetDimension } from '../../entities/observations/entities.observations'
import { MageEvent } from '../../entities/events/entities.events'
import _ from 'lodash'
import { User, UserId } from '../../entities/users/entities.users'
import { TeamId } from '../../entities/teams/entities.teams'
import { PageOf, PagingParameters } from '../../entities/entities.global'



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
export interface ObservationRequest<Principal = unknown> extends AppRequest<Principal, ObservationRequestContext<Principal>> { }

export interface ObservationSearch {
  lastModifiedAfter?: Date
  lastModifiedBefore?: Date
  timestampAfter?: Date
  timestampBefore?: Date
  geometryIntersects?: [number, number, number, number]
  stateIsAnyOf?: ObservationState['name'][]
  isFlaggedImportant?: boolean
  isFavoriteOfUser?: UserId
  hasAttachments?: boolean
  userIsAnyOf?: UserId[]
  teamIsAnyOf?: TeamId[]
  filter?: ObservationFieldFilter
  orderBy?: FindObservationsSort
  paging?: PagingParameters
  populateUserNames?: boolean
}

export interface ReadObservationsRequest<T = ExoObservation> extends ObservationRequest {
  search: ObservationSearch
  mapping?: (x: ExoObservation) => T
}

export interface ReadObservations {
  <T>(req: ReadObservationsRequest<T>): Promise<AppResponse<T[] | PageOf<T>, PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface IterateObservations {
  (event: MageEvent, spec: FindObservationsStreamSpec): Promise<AsyncIterable<ObservationAttrs> & { close?: () => void }>
}

export interface AllocateObservationId {
  (req: AllocateObservationIdRequest): Promise<AppResponse<ObservationId, PermissionDeniedError>>
}
export interface AllocateObservationIdRequest extends ObservationRequest { }

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
  attachments: ExoAttachment[],
  noGeometry?: boolean
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

export function exoObservationFor(
  from: ObservationAttrs,
  user?: ObservationUserExpanded | undefined,
  importantFlagger?: ObservationUserExpanded | undefined
): ExoObservation {
  const { states, ...attrs } = copyObservationAttrs(from)
  const attachments = attrs.attachments.map(x => exoAttachmentFor(x))
  return {
    ...attrs,
    attachments,
    state: states ? states[0] : void (0),
    user: from.userId === user?.id ? exoObservationUserLiteFor(user) : void (0),
    important: from.important ? {
      ...from.important,
      user: from.important.userId === importantFlagger?.id ? exoObservationUserLiteFor(importantFlagger) : void (0)
    } : void (0)
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

export function exoObservationUserLiteFor(from: ObservationUserExpanded | null | undefined): ExoObservationUserLite | undefined {
  return from ? { id: from.id, displayName: from.displayName } : void (0)
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

export function parseConditionFilter(condition: any): Condition | undefined {
  const binaryOperators = new Set(['=', '!=', '>', '>=', '<', '<=', 'LIKE'])
  const arrayOperators = new Set(['IN', 'NOT IN'])
  const nullOperators = new Set(['IS NULL', 'IS NOT NULL'])

  if (typeof condition !== 'object' || condition === null) {
    return undefined
  }

  if (Array.isArray(condition.and)) {
    const conditions = condition.and.map(parseConditionFilter)
    if (conditions.some((c: Condition | undefined) => c === undefined)) return undefined
    return { and: conditions }
  }

  if (Array.isArray(condition.or)) {
    const conditions = condition.or.map(parseConditionFilter)
    if (conditions.some((c: Condition | undefined) => c === undefined)) return undefined
    return { or: conditions }
  }

  if (typeof condition.formId !== 'number' || typeof condition.field !== 'string' || typeof condition.operator !== 'string') {
    return undefined
  }

  const { formId, field } = condition

  if (nullOperators.has(condition.operator)) {
    return { formId, field, operator: condition.operator }
  }

  if (condition.operator === 'BETWEEN') {
    if (!Array.isArray(condition.value) || condition.value.length !== 2) return undefined
    const [a, b] = condition.value
    if (!['string', 'number'].includes(typeof a) || !['string', 'number'].includes(typeof b)) return undefined
    return { formId, field, operator: 'BETWEEN', value: [a, b] }
  }

  if (arrayOperators.has(condition.operator)) {
    if (!Array.isArray(condition.value) || condition.value.some((v: any) => !['string', 'number', 'boolean'].includes(typeof v))) return undefined
    return { formId, field, operator: condition.operator, value: condition.value }
  }

  if (binaryOperators.has(condition.operator)) {
    if (!['string', 'number', 'boolean'].includes(typeof condition.value)) return undefined
    return { formId, field, operator: condition.operator, value: condition.value }
  }

  return undefined
}
