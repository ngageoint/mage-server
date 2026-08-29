import { Feature, Geometry } from 'geojson'
import { PendingEntityId } from '../entities.global'
import { JsonPrimitive } from '../entities.json_types'
import { MageEventId } from '../events/entities.events'
import { FormId } from '../events/entities.events.forms'
import { UserId } from '../users/entities.users'

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
  important?: Readonly<ObservationImportantFlag> | undefined | null
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

  /**
   * A boolean flag to indicate whether the observation has geometry.
   */
  noGeometry?: boolean
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

export const ObservationStateName = {
  Active: 'active',
  /**
   * This state essentially marks the observation as deleted.  The mobile apps use this so the server still returns
   * deleted observations in queries and the mobile apps can delete their local records, or at least mark them deleted
   * and hide them from view.
   * TODO: actually delete the observation data and return only deleted observation IDs to clients
   */
  Archived: 'archive',
} as const

export type ObservationStateName = typeof ObservationStateName[keyof typeof ObservationStateName]

export interface ObservationState {
  id: string | PendingEntityId
  name: ObservationStateName
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

export const AttachmentProcessingStatus = Object.freeze({
  Pending: 'pending',
  Success: 'success',
  Rejected: 'rejected',
  Error: 'error'
} as const)

export type AttachmentProcessingStatus = (typeof AttachmentProcessingStatus)[keyof typeof AttachmentProcessingStatus]

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
  /**
   * TODO: this needs to allow a more robust value, such as
   * `undefined | boolean` or maybe even allow `{ error: string }` so the
   * image plugin's unprocessed attachment query can easily find attachments
   * that have not yet been touched vs. attachments whose content could not be
   * oriented.  admins should also be able to easily query for the faulty
   * attachments to take corrective action if possible.
   *
   * also, because this and the `thumbnails` field are specific to the image
   * plugin, they should both be moved out of the core domain type.
   */
  oriented: boolean
  thumbnails: Thumbnail[]
  processingStatus?: AttachmentProcessingStatus
  processingMessage?: string
  processingHook?: string
  /**
   * The ID of this attachment's staged content, if any, returned from
   * {@link AttachmentStore.stagePendingContent}.  Persisted so a later,
   * separate process (e.g. a background attachment-processing job) can find
   * and finalize or discard the staged file, since the original upload
   * request's local reference to it does not survive past that request.
   */
  stagedContentId?: string

  //
  processingRetryCount?: number
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

/**
 * Members of this enum refer to the entries of a `FormField` that define
 * various constraints on the entry values the field allows.
 */
export const FieldConstraintKeys = {
  /**
   * Indicate the `required` constraint of the form field.
   */
  Required: 'required',
  /**
   * Indicate the `min` constraint of the form field.
   */
  Min: 'min',
  /**
   * Indicate the `max` constraint of the form field.
   */
  Max: 'max',
  /**
   * Indicate the `pattern` constraint of the form field.
   */
  Pattern: 'pattern',
  /**
   * Indicate the `choices` constraint of the form field.
   */
  Choices: 'choices',
  /**
   * Indicate the expected type of the raw value itself.
   */
  Value: 'value',
} as const

export type FieldConstraintKey = typeof FieldConstraintKeys[keyof typeof FieldConstraintKeys]

export type FieldValidationResult =
  | {
    /**
     * `resolved` indicates the entry is valid and no further validation is necessary,
     * while `pass` indicates the entry is valid with respect to a single constraint,
     * but may still be subject to further constraints.
     */
    valid: 'resolved' | 'pass'
    invalid: false
    /**
     * A normalized entry is the result of a transformation of the entry from one form
     * to a canonical form, e.g., parsing a date from a ISO-8601 string, or changing
     * JavaScript `undefined` to JSON `null`.  If `normalizedEntry` is `undefined`,
     * no transformation occurred, and the original entry is intact.
     */
    normalizedEntry?: FormFieldEntry | undefined
  }
  | {
    valid: false
    invalid: true
    failedMessage: string
    failedConstraint: FieldConstraintKey
  }

