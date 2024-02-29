import { UserId } from '../users/entities.users'
import { BBox, Feature, Geometry } from 'geojson'
import { MageEvent, MageEventAttrs, MageEventId } from '../events/entities.events'
import { PageOf, PagingParameters, PendingEntityId } from '../entities.global'
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
  important?: Readonly<ObservationImportantFlag> | undefined
  /**
   * TODO: scalability - potential problem if thousands of users favorite;
   * this should not be returned to the client
   */
  favoriteUserIds: readonly UserId[]
  /**
   * * TODO: scalability - likely not a problem in practice most of the time
   * * TODO: we do not actually have a reason to maintain an array of states -
   *   state should just be a single value object, and should not need
   *   a unique id
   */
  states: readonly ObservationState[]
}

export interface ObservationFeatureProperties {
  /**
   * This timestamp is a user-supplied timestamp that indicates the actual time
   * the observation occurred.
   */
  timestamp: Date
  forms: FormEntry[]
  /**
   * The provider is the source of the location coordinate.  This is usually
   * either 'gps', as in from a mobile device, or 'manual' for a manually
   * positioned point or polygon.  This could also be something different like
   * 'wifi' depending on the device.  Android devices in particular from
   * different manufacturers might submit varying provider strings.
   */
  provider?: string
  /**
   * The accuracy radius in meters of the location from a device GPS
   */
  accuracy?: number
  /**
   * Time in milliseconds between the last GPS location update from the device
   * and the time the device posted the observation
   */
  delta?: number
}

export interface ObservationImportantFlag {
  userId?: UserId
  timestamp?: Date
  description?: string
}

export interface ObservationState {
  id: string | PendingEntityId
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

export type FormFieldEntryItem = Exclude<JsonPrimitive, null> | Geometry | Date
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
  /**
   * TODO: Nothing seems to use this property.  Should we remove it, or
   * actually use it to inform browser caching?
   */
  lastModified?: Date
  /**
   * The content type is an IANA standard media type string, e.g., `image/jpeg`.
   */
  contentType?: string
  size?: number
  name?: string
  width?: number
  height?: number
  /**
   * The attachment's content locator is an abstract term that mostly exists
   * to reconcile with the legacy design of storing the relative file system
   * path of an attachment's file on the attachment document itself.  However,
   * as MAGE transitions to cloud-native infrastructure, one can more easily
   * envision swapping some sort of cloud-based BLOB storage service for the
   * legacy local file system storage.  Renaming the old `relativePath`
   * property to `contentLocator` is an attempt to allow for saving a lookup key
   * that does not necessarily imply an underlying file system as the storage
   * layer.  Implementations of the abstract {@link AttachmentStore} interface
   * would assign their own lookup key to this property, although the intention
   * of that interface's design is to be completely opaque with respect to how
   * an implementation stores and indexes attachment content.  An attachment
   * store implementation may not use `contentLocator` at all.
   */
  contentLocator?: string
  oriented: boolean
  thumbnails: Thumbnail[]
}

export interface Thumbnail {
  minDimension: number
  /**
   * See {@link Attachment.contentLocator} for an explanation.
   */
  contentLocator?: string
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
    important: from.important ? copyImportantFlagAttrs(from.important) : undefined,
    favoriteUserIds: Object.freeze([ ...from.favoriteUserIds ]),
    states: Object.freeze(from.states.map(copyObservationStateAttrs)),
    type: 'Feature',
    // meh, these shallow copies are probably fine ... right?
    geometry: Object.freeze({ ...from.geometry }),
    properties: {
      ...from.properties,
      timestamp: new Date(from.properties.timestamp),
      forms: from.properties.forms.map(x => ({ ...x })),
    }
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
    contentLocator: from.contentLocator
  }
}

export function copyThumbnailAttrs(from: Thumbnail): Thumbnail {
  return {
    minDimension: from.minDimension,
    contentLocator: from.contentLocator,
    contentType: from.contentType,
    name: from.name,
    size: from.size,
    width: from.width,
    height: from.height
  }
}

export function copyObservationStateAttrs(from: ObservationState): ObservationState {
  return {
    id: from.id,
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
    return createObservation(attrs, mageEvent)
  }

  /**
   * TODO: This does not currently do anything besides refreshing the
   * `lastModified` timestamp on the updated observation and calling
   * {@link Observation.evaluate()} with the given update attributes.
   * Eventually this should perform the logic to find the differences and
   * produce the domain events resulting from updating the target observation
   * to the update attributes.
   * TODO: Some update logic is currently in the application layer, but perhaps
   * should move here, such as preserving states, important flags, and location
   * provider/accuracy/delta from the original observation.
   *
   * Return an {@link ObservationUpdateError} if the event IDs on the target
   * and udpate do not match.
   *
   * @param target
   * @param update
   * @returns
   */
  static assignTo(target: Observation, update: ObservationAttrs): Observation | ObservationUpdateError {
    if (update.eventId !== target.eventId) {
      return ObservationUpdateError.eventIdMismatch(target.eventId, update.eventId)
    }
    update = {
      ...update,
      createdAt: new Date(target.createdAt),
      lastModified: new Date()
    }
    const updateAttachments = update.attachments.reduce((updateAttachments, att) => {
      return updateAttachments.set(att.id, att)
    }, new Map<AttachmentId, Attachment>())
    const removedAttachments = target.attachments.filter(x =>!updateAttachments.has(x.id))
    // TODO: whatever other mods generate events that matter
    const updateEvents = removedAttachments.length ? [ AttachmentsRemovedDomainEvent(target, removedAttachments) ] : [] as PendingObservationDomainEvent[]
    const pendingEvents = mergePendingDomainEvents(target, updateEvents)
    return createObservation(update, target.mageEvent, pendingEvents)
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
  readonly important?: Readonly<ObservationImportantFlag> | undefined
  readonly states: readonly ObservationState[]
  readonly favoriteUserIds: readonly UserId[]
  readonly type = 'Feature'
  readonly bbox?: BBox | undefined
  readonly geometry: Readonly<Geometry>
  readonly properties: Readonly<ObservationFeatureProperties>
  readonly attachments: readonly Attachment[]
  readonly pendingEvents: readonly PendingObservationDomainEvent[]

  constructor(...args: unknown[]) {
    if (args[0] !== ObservationConstructionToken) {
      throw new Error('use a factory function to create an observation instance')
    }
    const attrs = args[1] as ObservationAttrs
    this.mageEvent = args[2] as MageEvent
    this.id = attrs.id
    this.eventId = attrs.eventId
    this.userId = attrs.userId
    this.deviceId = attrs.deviceId
    this.createdAt = new Date(attrs.createdAt)
    this.lastModified = new Date(attrs.lastModified)
    this.important = attrs.important ? Object.freeze({ ...attrs.important }) : undefined
    const states = attrs.states.length ? attrs.states.map(copyObservationStateAttrs) : [
      {
        id: PendingEntityId,
        name: 'active',
        userId: attrs.userId
      }
    ] as ObservationState[]
    this.states = Object.freeze(states)
    this.favoriteUserIds = Object.freeze(attrs.favoriteUserIds.slice())
    this.type = 'Feature'
    this.bbox = attrs.bbox
    this.geometry = attrs.geometry
    this.attachments = Object.freeze([ ...attrs.attachments ])
    this.properties = { ...attrs.properties }
    this.#formEntriesById = new Map(this.properties.forms.map(x => [ x.id, x ]))
    this.#attachmentsById = new Map(this.attachments.map(x => [ x.id, x ]))
    this.#validation = args[3] as ObservationValidationResult
    this.pendingEvents = (args[4] || []) as PendingObservationDomainEvent[]
  }

  get validation(): ObservationValidationResult {
    return this.#validation
  }

  /**
   * This is a convenience accessor for {@link ObservationFeatureProperties.timestamp}.
   */
  get timestamp(): Date {
    return this.properties.timestamp
  }

  /**
   * This is a convenience accessor for {@link ObservationFeatureProperties.forms}.
   */
  get formEntries(): FormEntry[] {
    return Array.from(this.#formEntriesById.values())
  }

  formEntryForId(id: FormEntryId): FormEntry | null {
    return this.#formEntriesById.get(id) || null
  }

  attachmentFor(id: AttachmentId): Attachment | null {
    return this.#attachmentsById.get(id) || null
  }

  attachmentsForField(fieldName: string, formEntryId: FormEntryId): Attachment[] {
    return attachmentsForField(fieldName, formEntryId, this)
  }
}

export enum ObservationDomainEventType {
  AttachmentsRemoved = 'Observation.AttachmentsRemoved',
}

/**
 * A pending domain event waits for dispatch in the {@link Observation.pendingEvents | pending events}
 * on the observation instance that generated the event.  To avoid a circular
 * reference, pending events do not have a member for the observation instance
 * that generated them.
 */
export type PendingObservationDomainEvent = {
  readonly type: ObservationDomainEventType
} & (
  | {
    type: ObservationDomainEventType.AttachmentsRemoved
    readonly removedAttachments: readonly Readonly<Attachment>[]
  }
)

// export type ObservationDomainEvent = PendingObservationDomainEvent & {

//   readonly observation: Observation
// }

/**
 * This type simply adds the subject observation instance to the {@link PendingObservationDomainEvent}
 * so listeners of the event will have the observation that generated the
 * event when received.
 */
export type ObservationEmitted<Pending extends PendingObservationDomainEvent> = Pending & {
  /**
   * For now, this value is the snapshot of the observation just after the save
   * operation that initiated domain event dispatch.  Hence, this observation
   * will have no pending events and reflects the state of the observation
   * after the mutations that created the domain events.  That understanding
   * could change if more domain event requirements present themselves, but
   * this is sufficient for the, at this time, singular domain event that
   * supports attachment removal.
   */
  readonly observation: Observation
}

export type AttachmentsRemovedDomainEvent = Extract<PendingObservationDomainEvent, { type: ObservationDomainEventType.AttachmentsRemoved }>

export interface ObservationValidationResult {
  readonly hasErrors: boolean
  readonly coreAttrsErrors: { readonly [attr in ObservationValidationCoreAttrKey]?: string }
  readonly formCountErrors: readonly [ FormId, FormCountError ][]
  readonly formEntryErrors: readonly [ number, FormEntryValidationError ][]
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

  #entryLevelErrors: Set<FormEntryValidationErrorReason> = new Set()
  #fieldErrors: Map<string, FormFieldValidationError> = new Map()

  /**
   * If there is no form reference error, set the form name for convenience
   * when building the validation error message text.
   */
  formName: string | null = null

  constructor(readonly formEntryId: FormEntryId, readonly formEntryPosition: number) {}

  addEntryLevelError(x: FormEntryValidationErrorReason): this {
    this.#entryLevelErrors.add(x)
    return this
  }

  addFieldError(x: FormFieldValidationError): this {
    this.#fieldErrors.set(x.fieldName, x)
    return this
  }

  get entryLevelErrors(): Set<FormEntryValidationErrorReason> {
    return new Set(this.#entryLevelErrors)
  }

  /**
   * This is a map of field names to form field validation errors.
   */
  get fieldErrors(): Map<string, FormFieldValidationError> {
    return new Map(this.#fieldErrors)
  }
}

export enum FormEntryValidationErrorReason {
  FormRef = 'FormEntryValidationErrorReason.FormRef',
  DuplicateId = 'FormEntryValidationErrorReason.DuplicateId'
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
  FieldRef = 'AttachmentValidationErrorReason.FieldRef',
  FormEntryRef = 'AttachmentValidationErrorReason.FormEntryRef',
  DuplicateId = 'AttachmentValidationErrorReason.DuplicateId',
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
  for (const [ formEntryId, formEntryErr ] of formEntryErrors) {
    errList.push(`${bulletPoint} Form entry ${formEntryErr.formEntryPosition + 1} (${formEntryErr.formName}) is invalid.`)
    for (const fieldErr of formEntryErr.fieldErrors.values()) {
      errList.push(`  ${bulletPoint} ${fieldErr.message}`)
    }
  }
  for (const [ pos, attachmentErr ] of attachmentErrors) {
    errList.push(`${bulletPoint} Attachment ${pos + 1} is invalid.  ${attachmentErr.message}`)
  }
  return errList.join('\n')
}

export enum ObservationUpdateErrorReason {
  EventId = 'event_id'
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

export function formEntryForId(formEntryId: FormEntryId, observation: ObservationAttrs): FormEntry | null {
  return observation.properties.forms.find(x => x.id === formEntryId) || null
}

export function attachmentsForField(field: FormField | string, formEntry: FormEntry | FormEntryId, observationAttrs: ObservationAttrs): Attachment[] {
  const fieldName = typeof field === 'object' ? field.name : field
  const formEntryId = typeof formEntry === 'object' && 'id' in formEntry && 'formId' in formEntry ? formEntry.id : formEntry
  return observationAttrs.attachments.filter(x => x.fieldName === fieldName && x.observationFormId === formEntryId)
}

/**
 * Remove the form entry with the given ID and return the resulting
 * (potentially invalid) observation.
 *
 * TODO: add a `FormEntryNotFound` error similar to `removeAttachment()`
 */
export function removeFormEntry(observation: Observation, formEntryId: FormEntryId): Observation {
  const mod = copyObservationAttrs(observation)
  const targetPos = observation.formEntries.findIndex(x => x.id === formEntryId)
  mod.properties.forms.splice(targetPos, 1)
  mod.attachments = observation.attachments.filter(x => x.observationFormId !== formEntryId)
  return Observation.assignTo(observation, mod) as Observation
}

export type AttachmentCreateAttrs = Omit<Attachment, 'id' | 'observationFormId' | 'fieldName' | 'lastModified'>
export type AttachmentPatchAttrs = Partial<AttachmentCreateAttrs>
export type AttachmentContentPatchAttrs = Required<Pick<Attachment, 'contentLocator' | 'size'>>
export type ThumbnailContentPatchAttrs = Required<Pick<Thumbnail, 'contentLocator' | 'size'>> & Thumbnail

/**
 * Add the given attachment to the given observation.  Return a new observation
 * instance with the added attachment, or return an {@link AttachmentAddError}
 * if the given attachment does not reference a valid form entry and field.
 * Note that the returned observation may still have validation errors resulting
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
  return Observation.assignTo(observation, mod) as Observation
}

/**
 * Update the attachment for the given ID with the given patch object.  Keys
 * that are present in the patch whose values are `undefined` will assign
 * `undefined` to the resulting updated attachment.  Keys not present in the
 * patch will have no affect on the resulting updated attachment.
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
  const patchHasProperty = (key: string): boolean => Object.prototype.hasOwnProperty.call(patch, key)
  patched.contentType = patchHasProperty('contentType') ? patch.contentType : patched.contentType
  patched.height = patchHasProperty('height') ? patch.height : patched.height
  patched.width = patchHasProperty('width') ? patch.width : patched.width
  patched.name = patchHasProperty('name') ? patch.name : patched.name
  patched.oriented = patchHasProperty('oriented') ? !!patch.oriented : patched.oriented
  patched.size = patchHasProperty('size') ? patch.size : patched.size
  patched.contentLocator = patchHasProperty('contentLocator') ? patch.contentLocator : patched.contentLocator
  patched.thumbnails = patchHasProperty('thumbnails') ? patch.thumbnails?.map(copyThumbnailAttrs) as Thumbnail[] : patched.thumbnails
  patched.lastModified = new Date()
  const patchedObservation = copyObservationAttrs(observation)
  const before = patchedObservation.attachments.slice(0, targetPos)
  const after = patchedObservation.attachments.slice(targetPos + 1)
  const attachments = before.concat(patched, after)
  patchedObservation.attachments = Object.freeze(attachments)
  patchedObservation.lastModified = new Date(patched.lastModified)
  return Observation.assignTo(observation, patchedObservation) as Observation
}

export function removeAttachment(observation: Observation, attachmentId: AttachmentId): Observation | AttachmentNotFoundError {
  const targetPos = observation.attachments.findIndex(x => x.id === attachmentId)
  const target = observation.attachments[targetPos]
  if (!target) {
    return new AttachmentNotFoundError(attachmentId)
  }
  const afterAttrs = copyObservationAttrs(observation)
  const attachments = afterAttrs.attachments.slice()
  attachments.splice(targetPos, 1)
  afterAttrs.attachments = attachments
  return Observation.assignTo(observation, afterAttrs) as Observation
}

/**
 * Add the given thumbnail to the given attachment.  If the attachment already
 * has a thumbnail at the same minimum dimension as the given thumbnail,
 * replace the existing thumbnail with the given thumbnail at the same position
 * in the thumbnails array.
 * @param observation
 * @param attachmentId
 * @param thumbnail
 * @returns
 */
export function putAttachmentThumbnailForMinDimension(observation: Observation, attachmentId: AttachmentId, thumbnail: Thumbnail): Observation | AttachmentNotFoundError {
  const target = observation.attachmentFor(attachmentId)
  if (!target) {
    return new AttachmentNotFoundError(attachmentId)
  }
  const thumbnailsPatch = target.thumbnails.map(copyThumbnailAttrs)
  const targetThumbPos = thumbnailsPatch.findIndex(x => x.minDimension === thumbnail.minDimension)
  const putThumbAttrs = copyThumbnailAttrs(thumbnail)
  if (targetThumbPos >= 0) {
    thumbnailsPatch[targetThumbPos] = putThumbAttrs
  }
  else {
    thumbnailsPatch.push(putThumbAttrs)
  }
  return patchAttachment(observation, attachmentId, { thumbnails: thumbnailsPatch })
}

/**
 * Return the index of the thumbnail on the given attachment that best satisfies
 * the given target dimension.  That will be the thumbnail with the smallest
 * {@link Attachment.minDimension} greater than the target dimension.
 */
export function thumbnailIndexForTargetDimension(targetDimension: number, attachment: Attachment): number | undefined {
  if (attachment.thumbnails.length === 0) {
    return void(0)
  }
  return attachment.thumbnails.reduce<number | undefined>((best, candidate, index) => {
    if (candidate.minDimension >= targetDimension &&
      (best === undefined || candidate.minDimension < attachment.thumbnails[best].minDimension)) {
      return index
    }
    return best
  }, void(0))
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
  allocateObservationId(): Promise<ObservationId>
  /**
   * Save the given observation.  This operation uses PUT semantics, so
   * essentially overwrites an existing observation with the given attributes.
   * Therefore, the risk of conflicting udpates exists, when two or more
   * clients fetch the same version of an observation, and each client makes
   * different changes to the observation, the client that saves its changes
   * last will win, overwriting the changes the other clients saved.
   * @param observation
   */
  save(observation: Observation): Promise<Observation | ObservationRepositoryError>
  findById(id: ObservationId): Promise<Observation | null>
  /**
   * Return the most recent observation in the event as determined by
   * the observation's `lastModified` timestamp.  Return null if there are no
   * observations in the event.
   * @returns an `Observation` object or `null`
   */
  findLatest(): Promise<ObservationAttrs | null>
  findLastModifiedAfter(timestamp: number, paging: PagingParameters): Promise<PageOf<ObservationAttrs>>
  /**
   * Update the specified attachment with the given attributes.  This
   * persistence function exists alongside the {@link save} method to prevent
   * concurrent updates from colliding and overwriting each other.  That
   * situation is common when storing attachment content because a single
   * client will intiate several parallel content uploads for multiple
   * attachments.  Each separate content upload could fetch the same version of
   * the observation from the database, store the content, then update that
   * version of the observation record.  If using the whole observation `save()`
   * method to apply the update just for a single attachment, each save
   * operation would overwrite the changes for the save operations that came
   * before.  Return the updated `Observation` entity instance on a successful
   * update.  Return an `AttachmentNotFoundError` if the given observation did
   * not have an attachment with the given attachment ID.  Return null if the
   * given observation does not exist in the database.
   *
   * Note that this is a shallow patch, so if the patch has the `thumbnails`
   * key, the method will persist the value of that key to the database, as
   * opposed to deeply patching any thumbnails present in the array.  This
   * method should essentially use {@link patchAttachment} to perform the
   * patch for the resulting attachment.
   *
   * TODO: Account for patch invalidating the attachment media type.
   */
  patchAttachment(observation: Observation, attachmentId: AttachmentId, contentInfo: AttachmentPatchAttrs): Promise<Observation | AttachmentNotFoundError | null>
  /**
   * Because attachments reference a form entry by its ID, an API to generate
   * form entry IDs is necessary.
   */
  nextFormEntryIds(count?: number): Promise<FormEntryId[]>
  nextAttachmentIds(count?: number): Promise<AttachmentId[]>
}

export class ObservationRepositoryError extends Error {

  constructor(readonly code: ObservationRepositoryErrorCode, message?: string) {
    super(message)
  }
}

export enum ObservationRepositoryErrorCode {
  InvalidObservationId = 'ObservationRepositoryError.InvalidObservationId',
  InvalidObservation = 'ObservationRepositoryError.InvalidObservation'
}

export interface ObservationRepositoryForEvent {
  (event: MageEventId): Promise<EventScopedObservationRepository>
}

export type StagedAttachmentContentId = unknown

export class StagedAttachmentContentRef {
  constructor(readonly id: StagedAttachmentContentId) {}
}

export class StagedAttachmentContent extends StagedAttachmentContentRef {
  constructor(
    id: StagedAttachmentContentId,
    readonly tempLocation: NodeJS.WritableStream
  ) {
    super(id)
  }
}

/**
 * TODO: Maybe instead of the `null | Observation | AttachmentStoreError`
 * pattern many of these method signatures use, a single `AttachmentStoreResult`
 * class with a `success` flag and `observation` and `error` properties would
 * be eaiser for clients to consume.
 */
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
  stagePendingContent(): Promise<StagedAttachmentContent>
  /**
   * Save the given content to the store for the specified attachment.  If the
   * `content` argument is an ID for {@link StagedAttachmentContent staged content},
   * the store will move the content at the temporary location to the permanent
   * location for the specified attachment.  If the store assigns a new
   * {@link Attachment.contentLocator | content locator} to the attachment after
   * a successful save, and/or changes the size of the attachment to the actual
   * number of bytes written, return a {@link AttachmentContentPatchAttrs patch}
   * to {@link EventScopedObservationRepository.patchAttachment update}
   * the attachment  new observation instance with the {@link patchAttachment | patched}
   * attachment.  Return `null` if the save succeeded and no change to the
   * attachment was necessary.  Return an {@link AttachmentStoreError} if the
   * save failed.
   */
  saveContent(content: NodeJS.ReadableStream | StagedAttachmentContentRef, attachmentId: AttachmentId, observation: Observation): Promise<null | AttachmentContentPatchAttrs | AttachmentStoreError>
  /**
   * Similar to {@link saveContent()}, but for thumbnails of attachments.
   * The store distinguishes thumbnails by their standard minimum dimension.
   * If the `contentLocator` or the `size` of the stored thumbnail content is
   * different than what is on the input thumbnail meta-data, return thumbnail
   * attributes suitable to pass to {@link putAttachmentThumbnailForMinDimension}
   * to update the observation with the new attachment thumbnail.
   */
  saveThumbnailContent(content: NodeJS.ReadableStream | StagedAttachmentContentId, minDimension: number, attachmentId: AttachmentId, observation: Observation): Promise<null | ThumbnailContentPatchAttrs | AttachmentStoreError>
  /**
   * Return a read stream of the content for the given attachment.  The client
   * can specify an optional zero-based range of bytes to read from the
   * content, which will return a read stream limited the specified range.
   * Note that the end index of the range is inclusive, as is the case with
   * Node's streams API, as opposed to array and string operations, for
   * which the end index is usually exclusive.  Return `null` if not content
   * exists for the given attachment.  Return an `AttachmentStoreError` if
   * an error occurred reading from the underlying storage.
   */
  readContent(attachmentId: AttachmentId, observation: Observation, range?: { start: number, end?: number }): Promise<NodeJS.ReadableStream | null | AttachmentStoreError>
  readThumbnailContent(minDimension: number, attachmentId: AttachmentId, observation: Observation): Promise<NodeJS.ReadableStream | null | AttachmentStoreError>
  /**
   * Delete the given attachment's content, including thumbnail content.  If
   * the attachment no longer exists on the given observation, return null upon
   * success.  If the attachment still exists on the observation, return
   * {@link AttachmentContentPatchAttrs patch} attributes that reflect the
   * missing content to {@link EventScopedObservationRepository.patchAttachment update}
   * the attachment.
   */
  deleteContent(attachment: Attachment, observation: Observation): Promise<null | AttachmentPatchAttrs | AttachmentStoreError>
}

export class AttachmentStoreError extends Error {

  static invalidAttachmentId(attachmentId: AttachmentId, observation: Observation): AttachmentStoreError {
    return new AttachmentStoreError(AttachmentStoreErrorCode.InvalidAttachmentId, `observation ${observation.id} has no attachment ${attachmentId}`)
  }

  static invalidThumbnailDimension(minDimension: number, attachmentId: AttachmentId, observation: Observation): AttachmentStoreError {
    return new AttachmentStoreError(AttachmentStoreErrorCode.InvalidThumbnailDimension, `attachment ${attachmentId} on observation ${observation.id} has no thumbnail with dimension ${minDimension}`)
  }

  constructor(readonly errorCode: AttachmentStoreErrorCode, message?: string) {
    super(message)
    this.name = errorCode
  }
}

export enum AttachmentStoreErrorCode {
  /**
   * The given attachment ID was not found in the given observation's
   * attachment list.
   */
  InvalidAttachmentId = 'AttachmentStoreError.InvalidAttachmentId',
  InvalidThumbnailDimension = 'AttachmentStoreError.InvalidThumbnailDimension',
  /**
   * The content for the given attachment ID was not found in the attachment
   * store.
   */
  ContentNotFound = 'AttachmentStoreError.ContentNotFound',
  /**
   * The underlying storage system, e.g. file system, raised an error during
   * some I/O operation.
   */
  StorageError = 'AttachmentStoreError.StorageError'
}

function createObservation(attrs: ObservationAttrs, mageEvent: MageEvent, pendingEvents?: readonly PendingObservationDomainEvent[]): Observation {
  attrs = copyObservationAttrs(attrs)
  const validation = validateObservation(attrs, mageEvent)
  return new Observation(ObservationConstructionToken, attrs, mageEvent, validation, pendingEvents)
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
  const activeFormEntryCounts = mageEvent.forms.reduce((activeFormCounts, form) => {
    if (!form.archived) {
      activeFormCounts.set(form.id, 0)
    }
    return activeFormCounts
  }, new Map<FormId, number>())
  const formEntryIds = new Set<FormEntryId>()
  const formEntryCounts = observationAttrs.properties.forms.reduce((formEntryCounts, formEntry, formEntryPos) => {
    const formEntryError = new FormEntryValidationError(formEntry.id, formEntryPos)
    if (formEntryIds.has(formEntry.id)) {
      formEntryError.addEntryLevelError(FormEntryValidationErrorReason.DuplicateId)
    }
    formEntryIds.add(formEntry.id)
    const form = mageEvent.formFor(formEntry.formId)
    if (form) {
      if (activeFormEntryCounts.has(form.id)) {
        formEntryError.formName = form.name
        formEntryCounts.set(form.id, (formEntryCounts.get(form.id) || 0) + 1)
        validateFormFieldEntries(formEntry, form, formEntryError, validation)
      }
    }
    else {
      formEntryError.addEntryLevelError(FormEntryValidationErrorReason.FormRef)
    }
    if (formEntryHasErrors(formEntryError)) {
      validation.addFormEntryError(formEntryError)
    }
    return formEntryCounts
  }, activeFormEntryCounts)
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

function formEntryHasErrors(err: FormEntryValidationError): boolean {
  return err.entryLevelErrors.size > 0 || err.fieldErrors.size > 0
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

function FormFieldValidationResult(context: FormFieldValidationContext): fields.SimpleFieldValidationResult<FormFieldValidationError, FormFieldEntry | undefined> {
  return {
    failedBecauseTheEntry(reason: string, constraint: FieldConstraintKey = FieldConstraintKey.Value): FormFieldValidationError {
      return new FormFieldValidationError({ fieldName: context.field.name, message: `${context.field.title} ${reason}`, constraint: constraint })
    },
    succeeded(parsed?: FormFieldEntry): typeof parsed { return parsed }
  }
}

interface FormFieldValidationRule {
  (context: FormFieldValidationContext): FormFieldValidationError | FormFieldEntry | undefined
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

/**
 * TODO: This retains legacy functionality of only keying of form fields in the
 * event form to validate the values in the form entry.  However, this leaves
 * keys in the form entry that do not have a corresponding form field.  A
 * client could thus submit an observation with thousands of keys in a fomr
 * entry.
 */
function validateFormFieldEntries(formEntry: FormEntry, form: Form, formEntryError: FormEntryValidationError, validation: ObservationValidationContext): void {
  const { mageEvent, observationAttrs } = validation
  const formFields = form.fields || []
  const activeFields = formFields.filter(x => !x.archived)
  activeFields.forEach(field => {
    const fieldEntry = formEntry[field.name]
    const fieldValidation: FormFieldValidationContext = { field, fieldEntry, formEntry, mageEvent, observationAttrs }
    const resultEntry = FieldTypeValidationRules[field.type](fieldValidation)
    if (resultEntry instanceof FormFieldValidationError) {
      formEntryError.addFieldError(resultEntry)
    }
    else if (resultEntry !== void(0)) {
      formEntry[field.name] = resultEntry
    }
  })
}

class ObservationValidationContext {

  readonly observationAttrs: ObservationAttrs
  readonly mageEvent: MageEvent

  readonly #coreAttrsErrors: Map<ObservationValidationCoreAttrKey, string>
  readonly #formCountErrors: Map<FormId, FormCountError>
  readonly #formEntryErrors: Map<number, FormEntryValidationError>
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
    this.#formEntryErrors.set(formEntryError.formEntryPosition, formEntryError)
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

  get formEntryErrors(): Map<number, FormEntryValidationError> {
    return new Map(this.#formEntryErrors)
  }

  get attachmentErrors(): Map<number, AttachmentValidationError> {
    return new Map(this.#attachmentErrors)
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

function AttachmentsRemovedDomainEvent(observation: Observation, removedAttachments: Attachment[]): AttachmentsRemovedDomainEvent {
  return Object.freeze<AttachmentsRemovedDomainEvent>({
    type: ObservationDomainEventType.AttachmentsRemoved,
    removedAttachments: Object.freeze(removedAttachments)
  })
}

function mergePendingDomainEvents(from: Observation, nextEvents: PendingObservationDomainEvent[]): PendingObservationDomainEvent[] {
  const removedAttachments = [] as Readonly<Attachment>[]
  const merged = [ ...from.pendingEvents, ...nextEvents ].reduce((merged, e) => {
    if (e.type === ObservationDomainEventType.AttachmentsRemoved) {
      removedAttachments.push(...e.removedAttachments)
      return merged
    }
    else {
      return [ ...merged, e ]
    }
  }, [] as PendingObservationDomainEvent[])
  if (removedAttachments.length) {
    merged.push(AttachmentsRemovedDomainEvent(from, removedAttachments))
  }
  return merged
}

