import { UserId } from '../users/entities.users'
import { BBox, Feature, Geometry } from 'geojson'
import { MageEvent, MageEventAttrs, MageEventId } from '../events/entities.events'
import { PageOf, PagingParameters } from '../entities.global'
import { Form, FormField, FormFieldType, FormId } from '../events/entities.events.forms'
import * as fields from './entities.observations.fields'
import { JsonPrimitive } from '../entities.json_types'


export type ObservationId = string

export interface ObservationAttrs extends Feature<Geometry, ObservationFeatureProperties> {
  id: ObservationId
  eventId: MageEventId
  userId?: UserId
  // TODO: should be a strongly typed id-type
  deviceId?: string
  createdAt: Date
  lastModified: Date
  attachments: readonly Attachment[]
  importantFlag?: Readonly<ObservationImportantFlag> | undefined
  /**
   * TODO: scalability - potential problem if thousands of users favorite;
   * this should not be returned to the client
   */
  favoriteUserIds?: readonly UserId[]
  /**
   * TODO: scalability - likely not a problem in practice most of the time
   */
  states: readonly ObservationState[]
}

export interface ObservationFeatureProperties {
  /**
   * This timestamp is a user-supplied timestamp that indicates the actual time
   * time the observation occurred.
   */
  timestamp: Date
  forms: FormEntry[]
}

export interface ObservationImportantFlag {
  userId?: UserId
  timestamp?: Date
  description?: string
}

export interface ObservationState {
  name: 'active' | 'archived'
  userId?: UserId | undefined
}

export type FormEntryId = string

/**
 * TODO: create strong types and union for form field values, basically json
 * primitives along with attachment array and geojson geometry object
 */
export interface FormEntry {
  id: FormEntryId
  formId: FormId
  [formFieldName: string]: FormFieldEntry
}

export type FormFieldEntryItem = Exclude<JsonPrimitive, null> | Geometry
export type FormFieldEntry = FormFieldEntryItem | FormFieldEntryItem[] | null

export type AttachmentId = string
/**
 * TODO: Currently the web app uses the `name` and `contentType` keys in the
 * attachment object to correlate pending file uploads to newly saved
 * attachments.  While this works most of the time, especially for the web
 * when uplaods are nearly immediate, maybe something like a `pendingUploadId`
 * key would be more reliable for correlating a saved attachment record to
 * the file that the client intends to upload for that attachment.
 */
export interface Attachment {
  /**
   * Attachment IDs are globally unique, not unique only in the context of an
   * observation or form entry.
   */
  id: AttachmentId
  observationFormId: FormEntryId
  fieldName: string
  lastModified?: Date
  /**
   * The content type is an IANA standard media type string, e.g., `image/jpeg`.
   */
  contentType?: string
  size?: number
  name?: string
  width?: number
  height?: number
  oriented: boolean
  thumbnails: Thumbnail[]
}

export interface Thumbnail {
  minDimension: number
  contentType?: string
  size?: number
  name?: string
  width?: number
  height?: number
}

export function copyObservationAttrs(from: ObservationAttrs): ObservationAttrs {
  return {
    id: from.id,
    eventId: from.eventId,
    userId: from.userId,
    deviceId: from.deviceId,
    createdAt: new Date(from.createdAt.getTime()),
    lastModified: new Date(from.lastModified.getTime()),
    attachments: from.attachments.map(copyAttachmentAttrs),
    importantFlag: from.importantFlag ? copyImportantFlagAttrs(from.importantFlag) : undefined,
    favoriteUserIds: from.favoriteUserIds ? Object.freeze([ ...from.favoriteUserIds ]) : undefined,
    states: Object.freeze(from.states.map(copyObservationStateAttrs)),
    type: 'Feature',
    // meh, these shallow copies are probably fine ... right?
    geometry: Object.freeze({ ...from.geometry }),
    properties: { ...from.properties, forms: from.properties.forms.map(x => ({ ...x })), timestamp: new Date(from.properties.timestamp) }
  }
}

export function copyAttachmentAttrs(from: Attachment): Attachment {
  return {
    id: from.id,
    fieldName: from.fieldName,
    observationFormId: from.observationFormId,
    lastModified: from.lastModified ? new Date(from.lastModified) : undefined,
    contentType: from.contentType,
    name: from.name,
    size: from.size,
    width: from.width,
    height: from.height,
    oriented: from.oriented,
    thumbnails: from.thumbnails.map(copyThumbnailAttrs),
  }
}

export function copyThumbnailAttrs(from: Thumbnail): Thumbnail {
  return {
    minDimension: from.minDimension,
    contentType: from.contentType,
    name: from.name,
    size: from.size,
    width: from.width,
    height: from.height
  }
}

export function copyObservationStateAttrs(from: ObservationState): ObservationState {
  return {
    name: from.name,
    userId: from.userId
  }
}

export function copyImportantFlagAttrs(from: ObservationImportantFlag): ObservationImportantFlag {
  return {
    userId: from.userId,
    description: from.description,
    timestamp: from.timestamp ? new Date(from.timestamp.getTime()) : undefined
  }
}

const ObservationConstructionToken = Symbol('ObservationConstructor')

/**
 * The intention of this class is to provide a mutation model for observation
 * updates.  While `ObservationAttrs` is more just raw the keys and values of
 * observations, this class retains some extra context for validation so
 * the client can make changes to the observation data while receiving
 * validation feedback for every operation performed on the observation.
 * TODO: add domain event tracking to this class
 */
export class Observation implements Readonly<ObservationAttrs> {

  /**
   * Validate the given observation attributes against the given MAGE event's
   * constraints and forms, and create the corresponding `Observation` instance
   * with the validation result.
   * @param attrs
   * @param mageEvent
   */
  static evaluate(attrs: ObservationAttrs, mageEvent: MageEvent): Observation {
    const validation = validateObservation(attrs, mageEvent)
    return new Observation(ObservationConstructionToken, attrs, mageEvent, validation)
  }

  /**
   * TODO: This does not currently do anything besides assigning the
   * `lastModified` timestamp on the updated observation and calling
   * {@link Observation.evaluate()} with the given update attributes.
   * Eventually this should perform the logic to find the differences and
   * produce the domain events resulting from updating the target observation
   * to the update attributes.
   * @param target
   * @param update
   * @returns
   */
  static assignTo(target: Observation, update: ObservationAttrs): Observation | ObservationUpdateError {
    if (update.eventId !== target.eventId) {
      return ObservationUpdateError.eventIdMismatch(target.eventId, update.eventId)
    }
    update = copyObservationAttrs(update)
    update.lastModified = new Date()
    return Observation.evaluate(update, target.mageEvent)
  }

  #validation: ObservationValidationResult
  #formEntriesById: Map<FormEntryId, FormEntry>
  #attachmentsById: Map<AttachmentId, Attachment>

  readonly id: string
  readonly eventId: number
  readonly mageEvent: MageEvent
  /**
   * If an observation has no user ID, the user that created the observation
   * was removed from the system.
   */
  readonly userId?: UserId | undefined
  /**
   * If an observation has no device ID, the device that submitted the
   * observation was removed from the system.
   */
  readonly deviceId?: string | undefined
  readonly createdAt: Date
  readonly lastModified: Date
  readonly importantFlag?: Readonly<ObservationImportantFlag> | undefined
  readonly states: readonly ObservationState[]
  readonly favoriteUserIds?: readonly UserId[] | undefined
  readonly type = 'Feature'
  readonly bbox?: BBox | undefined
  readonly geometry: Readonly<Geometry>
  readonly properties: Readonly<ObservationFeatureProperties>
  readonly attachments: readonly Attachment[]

  constructor(...args: unknown[]) {
    if (args[0] !== ObservationConstructionToken) {
      throw new Error('use a factory function to create an observation instance')
    }
    const attrs = args[1] as ObservationAttrs
    this.mageEvent = args[2] as MageEvent
    this.id = attrs.id
    this.eventId = attrs.eventId
    this.userId = attrs.userId
    this.createdAt = attrs.createdAt
    this.lastModified = attrs.lastModified
    this.importantFlag = attrs.importantFlag ? Object.freeze({ ...attrs.importantFlag }) : undefined
    this.states = Object.freeze([ ...attrs.states ])
    this.type = 'Feature'
    this.bbox = attrs.bbox
    this.geometry = attrs.geometry
    this.attachments = Object.freeze([ ...attrs.attachments ])
    this.properties = { ...attrs.properties }
    this.#formEntriesById = new Map(this.properties.forms.map(x => [ x.id, x ]))
    this.#attachmentsById = new Map(this.attachments.map(x => [ x.id, x ]))
    this.#validation = args[3] as ObservationValidationResult
  }

  get validation(): ObservationValidationResult {
    return this.#validation
  }

  get formEntries(): FormEntry[] {
    return Array.from(this.#formEntriesById.values())
  }

  formEntryForId(id: FormEntryId): FormEntry | null {
    return this.#formEntriesById.get(id) || null
  }

  attachmentFor(id: AttachmentId): Attachment | null {
    return this.#attachmentsById.get(id) || null
  }

  attachmentsFor(fieldName: string, formEntryId: FormEntryId): Attachment[] {
    return attachmentsForField(fieldName, formEntryId, this)
  }
}

export interface ObservationValidationResult {
  readonly hasErrors: boolean
  readonly coreAttrsErrors: { readonly [attr in ObservationValidationCoreAttrKey]?: string }
  readonly formCountErrors: readonly [ FormId, FormCountError ][]

  readonly formEntryErrors: readonly [ FormEntryId, FormEntryValidationError ][]
  /**
   * This list contains attachment error map entries where the key is the
   * position of the attachment in the `attachments` array on the observation,
   * and the value is the `AttachmentValidationError`.
   */
  readonly attachmentErrors: readonly [ number, AttachmentValidationError ][]
  readonly totalFormCountError: TotalFormCountError | null
}

export function validateObservation(observationAttrs: ObservationAttrs, mageEvent: MageEvent): ObservationValidationResult {
  const validation =
    validateObservationFormEntries(
      validateObservationAttachments(
        validateObservationCoreAttrs(
          new ObservationValidationContext(observationAttrs, mageEvent))))
  return validation.result()
}

export type ObservationValidationCoreAttrKey = 'eventId' | 'type' | 'geometry' | 'timestamp' | 'forms'

export const MinFormsConstraint = Symbol('ObservationValidation.MinForms')
export const MaxFormsConstraint = Symbol('ObservationValidation.MaxForms')

export class TotalFormCountError {

  static tooFewFormEntries(mageEvent: MageEventAttrs): TotalFormCountError {
    return new TotalFormCountError(MinFormsConstraint, Number(mageEvent.minObservationForms))
  }

  static tooManyFormEntries(mageEvent: MageEventAttrs): TotalFormCountError {
    return new TotalFormCountError(MaxFormsConstraint, Number(mageEvent.maxObservationForms))
  }

  private constructor(
    readonly constraint: typeof MinFormsConstraint | typeof MaxFormsConstraint,
    readonly constraintCount: number) { }

  message(): string {
    if (this.constraint === MinFormsConstraint) {
      return `The event requires at least ${this.constraintCount} form ${this.constraintCount > 1 ? 'entries' : 'entry'}.`
    }
    return `The event allows at most ${this.constraintCount} form ${this.constraintCount > 1 ? 'entries' : 'entry'}.`
  }
}
export class FormCountError {

  static tooFewEntriesForForm(form: Form): FormCountError {
    return new FormCountError(MinFormsConstraint, Number(form.min), form.id, form.name)
  }

  static tooManyEntriesForForm(form: Form): FormCountError {
    return new FormCountError(MaxFormsConstraint, Number(form.max), form.id, form.name)
  }

  private constructor(
    readonly constraint: typeof MinFormsConstraint | typeof MaxFormsConstraint,
    readonly constraintCount: number,
    readonly formId: FormId,
    readonly formName: string
    ) { }

  message(): string {
    if (this.constraint === MinFormsConstraint) {
      return `The event requires at least ${this.constraintCount} ${this.formName} form ${this.constraintCount > 1 ? 'entries' : 'entry'}.`
    }
    return `The event allows at most ${this.constraintCount} ${this.formName} form ${this.constraintCount > 1 ? 'entries' : 'entry'}.`
  }
}

export class FormEntryValidationError {

  static invalidFormReference(formEntryId: FormEntryId, formEntryPosition: number): FormEntryValidationError {
    return new FormEntryValidationError(formEntryId, formEntryPosition)
  }

  #fieldErrors: Map<string, FormFieldValidationError> = new Map()

  constructor(readonly formEntryId: FormEntryId, readonly formEntryPosition: number, readonly formName: string | null = null) {}

  addFieldError(x: FormFieldValidationError): this {
    this.#fieldErrors.set(x.fieldName, x)
    return this
  }

  /**
   * This is a map of field names to form field validation errors.
   */
  get fieldErrors(): Map<string, FormFieldValidationError> {
    return new Map(this.#fieldErrors)
  }

  get isInvalidFormReference(): boolean {
    return this.formName === null
  }
}

export type FormFieldValidationErrorAttrs = {
  [Prop in keyof Omit<FormFieldValidationError, 'error'>]: FormFieldValidationError[Prop]
}

export enum FieldConstraintKey {
  Value = 'value',
  Min = 'min',
  Max = 'max',
  Required = 'required'
}

export class FormFieldValidationError {

  readonly fieldName: string
  readonly constraint: FieldConstraintKey
  readonly message: string

  constructor(attrs: FormFieldValidationErrorAttrs) {
    this.fieldName = attrs.fieldName
    this.constraint = attrs.constraint
    this.message = attrs.message
  }

  /**
   * `error` is a readonly accessor alias for `validationRuleKey` for backward
   * compatibility.
   * TODO: verify this is still necessary (NECESSARY?!)
   */
  get error(): string {
    return this.constraint
  }
}

export enum AttachmentValidationErrorReason {
  FieldRef = 'field',
  FormEntryRef = 'form_entry',
  DuplicateId = 'duplicate_id',
}

export class AttachmentValidationError {
  constructor(
    readonly reason: AttachmentValidationErrorReason,
    readonly message: string
  ) {}
}

export function validationResultMessage(result: ObservationValidationResult): string {
  const {
    coreAttrsErrors,
    totalFormCountError,
    formCountErrors,
    formEntryErrors,
    attachmentErrors,
  } = result
  const bulletPoint = '\u2022'
  const errList: string[] = []
  for (const message of Object.values(coreAttrsErrors)) {
    errList.push(`${bulletPoint} ${message}`)
  }
  if (totalFormCountError) {
    errList.push(`${bulletPoint} ${totalFormCountError.message()}`)
  }
  for (const [ formId, err ] of formCountErrors) {
    errList.push(`${bulletPoint} ${err.message()}`)
  }
  for (const [ pos, formEntryErr ] of formEntryErrors) {
    errList.push(`${bulletPoint} Form entry ${pos + 1} (${formEntryErr.formName}) is invalid.`)
    for (const fieldErr of formEntryErr.fieldErrors.values()) {
      errList.push(`  ${bulletPoint} ${fieldErr.message}`)
    }
  }
  for (const [ pos, attachmentErr ] of attachmentErrors) {
    errList.push(`${bulletPoint} Attachment ${pos + 1} is invalid.  ${attachmentErr.message}`)
  }
  return errList.join('\n')
}

export class ObservationUpdateError extends Error {

  static eventIdMismatch(expected: MageEventId, actual: MageEventId | undefined): ObservationUpdateError {
    return new ObservationUpdateError(ObservationUpdateErrorReason.EventId,
      `The update event ID ${actual} does not match the target event ID ${expected}.`)
  }

  constructor(readonly reason: ObservationUpdateErrorReason, message: string) {
    super(message)
  }
}

export enum ObservationUpdateErrorReason {
  EventId = 'event_id'
}

export function formEntryForId(formEntryId: FormEntryId, observation: ObservationAttrs): FormEntry | null {
  return observation.properties.forms.find(x => x.id === formEntryId) || null
}

export function attachmentsForField(field: FormField | string, formEntry: FormEntry | FormEntryId, observationAttrs: ObservationAttrs): Attachment[] {
  const fieldName = typeof field === 'object' ? field.name : field
  const formEntryId = typeof formEntry === 'object' && 'id' in formEntry && 'formId' in formEntry ? formEntry.id : formEntry
  return observationAttrs.attachments.filter(x => x.fieldName === fieldName && x.observationFormId === formEntryId)
}

export type AttachmentCreateAttrs = Omit<Attachment, 'id' | 'observationFormId' | 'fieldName' | 'lastModified'>
export type AttachmentPatchAttrs = Partial<AttachmentCreateAttrs>

/**
 * Add the given attachment to the given observation.  Return a new observation
 * instance with the added attachment, or return an {@link AttachmentValidationError}
 * if the given attachment does not reference a valid form entry and field.
 * Note that returned observation may still have validation errors resulting
 * from the added attachment if the attachment violates the associated form
 * constraints, such as min/max or allowed attachment types.
 * @param observation
 * @param fieldName
 * @param formEntryId
 * @param attrs
 * @returns
 */
export function addAttachment(observation: Observation, attachmentId: AttachmentId, fieldName: string, formEntryId: FormEntryId, attrs: AttachmentCreateAttrs): Observation | AttachmentAddError {

  const attachment: Attachment = {
    ...attrs,
    id: attachmentId,
    fieldName,
    observationFormId: formEntryId,
    lastModified: new Date()
  }
  const invalid = validateAttachment(attachment, observation, observation.mageEvent)
  if (invalid) {
    return AttachmentAddError.invalidNewAttachment(invalid)
  }
  const mod = copyObservationAttrs(observation)
  mod.attachments = [ ...mod.attachments, attachment ]
  return Observation.evaluate(mod, observation.mageEvent)
}

/**
 * Update the attachment for the given ID with the given patch object.  Keys
 * that are present in the patch whose values are `undefined` will assign
 * `undefined` to the resulting updated attachment.  Keys not present in the
 * patch will have not affect on the resulting updated attachment.
 * @param observation
 * @param attachmentId
 * @param patch
 * @returns
 */
 export function patchAttachment(observation: Observation, attachmentId: AttachmentId, patch: AttachmentPatchAttrs): Observation | AttachmentNotFoundError {
  const targetPos = observation.attachments.findIndex(x => x.id === attachmentId)
  const target = observation.attachments[targetPos]
  if (!target) {
    return new AttachmentNotFoundError(attachmentId)
  }
  const patched = copyAttachmentAttrs(target)
  patched.contentType = patch.hasOwnProperty('contentType') ? patch.contentType : patched.contentType
  patched.height = patch.hasOwnProperty('height') ? patch.height : patched.height
  patched.width = patch.hasOwnProperty('width') ? patch.width : patched.width
  patched.name = patch.hasOwnProperty('name') ? patch.name : patched.name
  patched.oriented = patch.hasOwnProperty('oriented') ? !!patch.oriented : patched.oriented
  patched.size = patch.hasOwnProperty('size') ? patch.size : patched.size
  patched.thumbnails = patch.hasOwnProperty('thumbnails') ? patch.thumbnails?.map(copyThumbnailAttrs) as Thumbnail[] : patched.thumbnails
  patched.lastModified = new Date()
  const patchedObservation = copyObservationAttrs(observation)
  const before = patchedObservation.attachments.slice(0, targetPos)
  const after = patchedObservation.attachments.slice(targetPos + 1)
  const attachments = before.concat(patched, after)
  patchedObservation.attachments = Object.freeze(attachments)
  patchedObservation.lastModified = new Date(patched.lastModified)
  return Observation.evaluate(patchedObservation, observation.mageEvent)
}

export class AttachmentAddError extends Error {

  static invalidNewAttachment(invalidErr: AttachmentValidationError): AttachmentAddError {
    return new AttachmentAddError(invalidErr)
  }

  constructor(readonly validationErr: AttachmentValidationError) {
    super(`Invalid new attachment: ${validationErr.message}`)
  }
}

export class AttachmentNotFoundError extends Error {
  constructor(readonly attachmentId: AttachmentId) {
    super(`Attachment ID ${attachmentId} does not exist.`)
  }
}

/**
 * This repository provides persistence operations for `Observation` entities
 * within the scope of one MAGE event.
 */
 export interface EventScopedObservationRepository {
  readonly eventScope: MageEventId
  /**
   * TODO: return errors for invalid ids, including observation, form entry,
   * and attachments
   * @param observation
   */
  save(observation: Observation): Promise<Observation>
  findById(id: ObservationId): Promise<Observation | null>
  /**
   * Return the most recent observation in the event as determined by
   * the observation's `lastModified` timestamp.  Return null if there are no
   * observations in the event.
   * @returns an `Observation` object or `null`
   */
  findLatest(): Promise<Observation | null>
  findLastModifiedAfter(timestamp: number, paging: PagingParameters): Promise<PageOf<ObservationAttrs>>
  nextFormEntryIds(count?: number): Promise<FormEntryId[]>
}

export interface ObservationRepositoryForEvent {
  (event: MageEventId): Promise<EventScopedObservationRepository>
}

export type PendingAttachmentContentId = unknown

export interface PendingAttachmentContent {
  id: PendingAttachmentContentId
  tempLocation: NodeJS.WritableStream
}

export interface AttachmentStore {
  /**
   * Create a temporary staging area to hold attachment content pending
   * persistence of the associated attachment record to the observation in the
   * database.  After saving the attachment record to the parent observation,
   * the client must move the temporary content to the proper permanent
   * location for the  saved attachment using the {@link saveContent()} function.
   * This mechanism is useful in cases when a content stream exists, but the
   * provider of the content stream needs to examine the bytes while streaming
   * to the temporary location in order to determine the attachment meta-data.
   * This mechanism also facilitates periodic cleanup of orphaned temporary
   * content.
   */
  stagePendingContent(): Promise<PendingAttachmentContent>
  /**
   * Save the given content to the store for the specified attachment.  If the
   * `content` argument is an ID for {@link PendingAttachmentContent staged content},
   * the store will move the content at the temporary location to the permanent
   * location for the specified attachment.
   * @param content
   * @param attachmentId
   * @param observation
   */
  saveContent(content: NodeJS.ReadableStream | PendingAttachmentContentId, attachmentId: AttachmentId, observation: Observation): Promise<null | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
  /**
   * Similar to {@link saveContent()}, but for thumbnails of attachments.
   * The store distinguishes thumbnails by their standard minimum dimension.
   * @param content
   * @param minDimension
   * @param attachmentId
   * @param observation
   */
  saveThumbnailContent(content: NodeJS.ReadableStream | PendingAttachmentContentId, minDimension: number, attachmentId: AttachmentId, observation: Observation): Promise<null | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
  readContent(attachmentId: AttachmentId, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
  readThumbnailContent(minDimension: number, attachmentId: AttachmentId, observation: Observation): Promise<NodeJS.ReadableStream | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
  deleteContent(attachmentId: AttachmentId, observation: Observation): Promise<null | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
  deleteThumbnailContent(minDimension: number, attachmentId: AttachmentId, observation: Observation): Promise<null | AttachmentStoreError<AttachmentStoreErrorCode.InvalidAttachmentId | AttachmentStoreErrorCode.ContentNotFound>>
}

export class AttachmentStoreError<Code extends AttachmentStoreErrorCode> extends Error {
  constructor(readonly errorCode: Code, message?: string) {
    super(message)
  }
}

export enum AttachmentStoreErrorCode {
  /**
   * The given attachment ID was not found in the given observation's
   * attachment list.
   */
  InvalidAttachmentId = 'AttachmentStoreError.InvalidAttachmentId',
  /**
   * The content for the given attachment ID was not found in the attachment
   * store.
   */
  ContentNotFound = 'AttachmentStoreError.ContentNotFound',
}

function validateObservationCoreAttrs(validation: ObservationValidationContext): ObservationValidationContext {
  const { observationAttrs, mageEvent } = validation
  if (observationAttrs.eventId !== mageEvent.id) {
    validation.addCoreAttrsError('eventId', `The observation event ID ${observationAttrs.eventId} does not match the asserted event ID ${mageEvent.id}.`)
  }
  if (observationAttrs.type !== 'Feature') {
    validation.addCoreAttrsError('type', `The observation GeoJSON type must be 'Feature'.`)
  }
  const invalidGeometry = fields.geometry.GeometryFieldValidation(
    { title: 'Geometry', id: 0, name: 'geometry', required: true, type: FormFieldType.Geometry },
    observationAttrs.geometry as any,
    { succeeded: () => null, failedBecauseTheEntry: reason => reason })
  if (invalidGeometry) {
    validation.addCoreAttrsError('geometry', `The observation geometry ${invalidGeometry}`)
  }
  if (!(observationAttrs.properties.timestamp instanceof Date)) {
    validation.addCoreAttrsError('timestamp', 'The observation requires a valid timestamp.')
  }
  return validation
}

function validateObservationFormEntries(validation: ObservationValidationContext): ObservationValidationContext {
  const { observationAttrs, mageEvent } = validation
  if (!Array.isArray(observationAttrs.properties.forms)) {
    return validation.addCoreAttrsError('forms', 'The observation requires an array of form entries.')
  }
  const formEntryCounts = observationAttrs.properties.forms.reduce((formEntryCounts, formEntry, formEntryPos) => {
    const form = mageEvent.formFor(formEntry.formId)
    if (form) {
      if (!form.archived) {
        formEntryCounts.set(formEntry.formId, (formEntryCounts.get(formEntry.formId) || 0) + 1)
        validateFormFieldEntries(formEntry, form, validation)
      }
    }
    else {
      validation.addFormEntryError(FormEntryValidationError.invalidFormReference(formEntry.id, formEntryPos))
    }
    return formEntryCounts
  }, new Map<FormId, number>())
  let totalActiveFormEntryCount = 0
  for (const [ formId, formEntryCount ] of formEntryCounts) {
    const form = mageEvent.formFor(formId)!
    if (typeof form.min === 'number' && formEntryCount < form.min) {
      validation.addFormCountError(FormCountError.tooFewEntriesForForm(form))
    }
    else if (typeof form.max === 'number' && formEntryCount > form.max) {
      validation.addFormCountError(FormCountError.tooManyEntriesForForm(form))
    }
    totalActiveFormEntryCount += formEntryCount
  }
  if (typeof mageEvent.minObservationForms === 'number' && totalActiveFormEntryCount < mageEvent.minObservationForms) {
    validation.setTotalFormCountError(TotalFormCountError.tooFewFormEntries(mageEvent))
  }
  else if (typeof mageEvent.maxObservationForms === 'number' && totalActiveFormEntryCount > mageEvent.maxObservationForms) {
    validation.setTotalFormCountError(TotalFormCountError.tooManyFormEntries(mageEvent))
  }
  // TODO: invalidate new form entries that reference archived forms
  return validation
}

function validateObservationAttachments(validation: ObservationValidationContext): ObservationValidationContext {
  const { observationAttrs, mageEvent } = validation
  const attachments = observationAttrs.attachments
  attachments.forEach((x, index) => {
    const invalid = validateAttachment(x, observationAttrs, mageEvent)
    if (invalid) {
      validation.setAttachmentError(index, invalid)
    }
  })
  return validation
}

function validateAttachment(attachment: Attachment, observation: ObservationAttrs, mageEvent: MageEvent): null | AttachmentValidationError {
  const formEntry = formEntryForId(attachment.observationFormId, observation)
  if (!formEntry) {
    return new AttachmentValidationError(
      AttachmentValidationErrorReason.FormEntryRef,
      `The attachment form entry reference ${attachment.observationFormId} is invalid.`)
  }
  const field = mageEvent.formFieldFor(attachment.fieldName, formEntry.formId)
  if (!field || field.type !== FormFieldType.Attachment) {
    return new AttachmentValidationError(
      AttachmentValidationErrorReason.FieldRef,
      `The attachment field reference ${attachment.fieldName} is invalid.`)
  }
  const dup = observation.attachments.find(x => x.id === attachment.id && x !== attachment)
  if (dup) {
    return new AttachmentValidationError(
      AttachmentValidationErrorReason.DuplicateId,
      `The attachment ID ${attachment.id} is not unique on the observation.`
    )
  }
  return null
}

interface FormFieldValidationContext {
  field: FormField,
  fieldEntry: FormFieldEntry,
  formEntry: FormEntry,
  observationAttrs: ObservationAttrs,
  mageEvent: MageEvent,
}

function FormFieldValidationResult(context: FormFieldValidationContext): fields.SimpleFieldValidationResult<FormFieldValidationError, null> {
  return {
    failedBecauseTheEntry(reason: string, constraint: FieldConstraintKey = FieldConstraintKey.Value): FormFieldValidationError {
      return new FormFieldValidationError({ fieldName: context.field.name, message: `${context.field.name} ${reason}`, constraint: constraint })
    },
    succeeded(): null { return null }
  }
}

interface FormFieldValidationRule {
  (context: FormFieldValidationContext): FormFieldValidationError | null
}

function validateRequiredThen(rule: FormFieldValidationRule): FormFieldValidationRule {
  return context => {
    const requiredError = fields.required.RequiredFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))
    if (requiredError) {
      return requiredError
    }
    return rule(context)
  }
}

// TODO: these could be improved to be more cleanly comosable in a functional way, e.g., monadic. i'll figure that out eventually
const FieldTypeValidationRules: { [type in FormFieldType]: FormFieldValidationRule } = {
  // attachments use min/max constraints, not required constraint
  [FormFieldType.Attachment]: context => fields.attachment.AttachmentFieldValidation(context.field, context.formEntry.id, context.observationAttrs, FormFieldValidationResult(context)),
  [FormFieldType.CheckBox]: validateRequiredThen(context => fields.checkbox.CheckboxFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.DateTime]: validateRequiredThen(context => fields.date.DateFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Dropdown]: validateRequiredThen(context => fields.select.SelectFormFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Email]: validateRequiredThen(context => fields.email.EmailFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Geometry]: validateRequiredThen(context => fields.geometry.GeometryFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  // TODO: no validation at all? legacy validation code did nothing for hidden fields
  [FormFieldType.Hidden]: context => null,
  [FormFieldType.MultiSelectDropdown]: validateRequiredThen(context => fields.multiselect.MultiSelectFormFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Numeric]: validateRequiredThen(context => fields.numeric.NumericFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Password]: validateRequiredThen(context => fields.text.TextFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Radio]: validateRequiredThen(context => fields.select.SelectFormFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.Text]: validateRequiredThen(context => fields.text.TextFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
  [FormFieldType.TextArea]: validateRequiredThen(context => fields.text.TextFieldValidation(context.field, context.fieldEntry, FormFieldValidationResult(context))),
}

function validateFormFieldEntries(formEntry: FormEntry, form: Form, validation: ObservationValidationContext): void {
  const { mageEvent, observationAttrs } = validation
  const formEntryPosition = validation.observationAttrs.properties.forms.findIndex(x => x.id === formEntry.id)
  const formFields = form.fields || []
  const activeFields = formFields.filter(x => !x.archived)
  const formEntryError = activeFields.reduce((formEntryError, field) => {
    const fieldEntry = formEntry[field.name]
    const fieldValidation: FormFieldValidationContext = { field, fieldEntry, formEntry, mageEvent, observationAttrs }
    const fieldError = FieldTypeValidationRules[field.type](fieldValidation)
    if (fieldError) {
      formEntryError.addFieldError(fieldError)
    }
    return formEntryError
  }, new FormEntryValidationError(formEntry.id, formEntryPosition, form.name))
  if (formEntryError.fieldErrors.size > 0) {
    validation.addFormEntryError(formEntryError)
  }
}

class ObservationValidationContext {

  readonly observationAttrs: ObservationAttrs
  readonly mageEvent: MageEvent

  readonly #coreAttrsErrors: Map<ObservationValidationCoreAttrKey, string>
  readonly #formEntryErrors: Map<FormEntryId, FormEntryValidationError>
  readonly #formCountErrors: Map<FormId, FormCountError>
  readonly #attachmentErrors: Map<number, AttachmentValidationError>
  #totalFormCountError: TotalFormCountError | null = null

  constructor(from: ObservationValidationContext)
  constructor(observationAttrs: ObservationAttrs, mageEvent: MageEvent)
  constructor(...args: [ from: ObservationValidationContext ] | [ attrs: ObservationAttrs, mageEvent: MageEvent ]) {
    const [ fromOrAttrs, maybeMageEvent ] = args
    if (fromOrAttrs instanceof ObservationValidationContext) {
      this.observationAttrs = fromOrAttrs.observationAttrs
      this.mageEvent = fromOrAttrs.mageEvent
      this.#coreAttrsErrors = new Map(fromOrAttrs.coreAttrsErrors)
      this.#formEntryErrors = new Map(fromOrAttrs.formEntryErrors)
      this.#formCountErrors = new Map(fromOrAttrs.formCountErrors)
      this.#attachmentErrors = new Map(fromOrAttrs.attachmentErrors)
    }
    else {
      this.observationAttrs = fromOrAttrs
      this.mageEvent = maybeMageEvent!
      this.#coreAttrsErrors = new Map()
      this.#formEntryErrors = new Map()
      this.#formCountErrors = new Map()
      this.#attachmentErrors = new Map()
    }
  }

  addCoreAttrsError(key: ObservationValidationCoreAttrKey, message: string): this {
    this.#coreAttrsErrors.set(key, message)
    return this
  }

  setTotalFormCountError(x: TotalFormCountError | null): this {
    this.#totalFormCountError = x
    return this
  }

  addFormCountError(x: FormCountError): this {
    this.#formCountErrors.set(x.formId, x)
    return this
  }

  addFormEntryError(formEntryError: FormEntryValidationError): this {
    this.#formEntryErrors.set(formEntryError.formEntryId, formEntryError)
    return this
  }

  setAttachmentError(index: number, err: AttachmentValidationError): this {
    this.#attachmentErrors.set(index, err)
    return this
  }

  get coreAttrsErrors(): Map<ObservationValidationCoreAttrKey, string> {
    return new Map(this.#coreAttrsErrors)
  }

  get formCountErrors(): Map<FormId, FormCountError> {
    return new Map(this.#formCountErrors)
  }

  get formEntryErrors(): Map<FormEntryId, FormEntryValidationError> {
    return new Map(this.#formEntryErrors)
  }

  get attachmentErrors(): Map<number, AttachmentValidationError> {
    return new Map(this.#attachmentErrors)
  }

  formEntryErrorForId(id: FormEntryId): FormEntryValidationError | null {
    return this.#formEntryErrors.get(id) || null
  }

  get totalFormCountError(): TotalFormCountError | null {
    return this.#totalFormCountError
  }

  get hasErrors(): boolean {
    return this.#coreAttrsErrors.size > 0
      || this.#totalFormCountError !== null
      || this.#formCountErrors.size > 0
      || this.#formEntryErrors.size > 0
      || this.#attachmentErrors.size > 0
  }

  result(): ObservationValidationResult {
    const hasErrors = this.hasErrors
    const coreAttrsErrors = Object.freeze(Object.fromEntries(this.coreAttrsErrors))
    const totalFormCountError = this.totalFormCountError
    const formCountErrors = Object.freeze(Array.from(this.formCountErrors.entries()))
    const formEntryErrors = Object.freeze(Array.from(this.formEntryErrors.entries()))
    const attachmentErrors = Object.freeze(Array.from(this.attachmentErrors.entries()))
    return Object.freeze<ObservationValidationResult>({
      hasErrors,
      coreAttrsErrors,
      totalFormCountError,
      formCountErrors,
      formEntryErrors,
      attachmentErrors,
    })
  }
}
