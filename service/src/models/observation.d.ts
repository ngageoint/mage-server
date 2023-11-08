import { Geometry } from 'geojson'
import mongoose from 'mongoose'
import { MageEventAttrs, MageEventId } from '../entities/events/entities.events'
import { Attachment, FormEntry, ObservationAttrs, ObservationFeatureProperties, ObservationId, ObservationImportantFlag, ObservationState, Thumbnail } from '../entities/observations/entities.observations'
import { MageEventDocument } from './event'

export type ObservationDocument = Omit<mongoose.Document, 'toJSON'> & Omit<ObservationAttrs, 'eventId' | 'userId' | 'deviceId' | 'important' | 'favoriteUserIds' | 'attachments' | 'states' | 'properties'> & {
  userId?: mongoose.Types.ObjectId
  deviceId?: mongoose.Types.ObjectId
  important?: ObservationDocumentImportantFlag
  favoriteUserIds: mongoose.Types.ObjectId[]
  states: ObservationStateDocument[]
  attachments: AttachmentDocument[]
  properties: ObservationDocumentProperties
  toJSON(options?: ObservationJsonOptions): ObservationDocumentJson
}
export interface ObservationModel extends mongoose.Model<ObservationDocument> {}
export type ObservationDocumentJson = Omit<ObservationAttrs, 'id' | 'eventId' | 'attachments' | 'states'> & {
  id: mongoose.Types.ObjectId
  eventId?: number
  url: string
  attachments: AttachmentDocumentJson[]
  states: ObservationStateDocumentJson[]
}

/**
 * This interface defines the options that one can supply to the `toJSON()`
 * method of the Mongoose Document instances of the Observation model.
 */
export interface ObservationJsonOptions extends mongoose.DocumentToObjectOptions {
  /**
   * The database schema does not include the event ID for observation
   * documents.  Use this option to add the `eventId` property to the
   * observation JSON document.
   */
  event?: MageEventDocument | MageEventAttrs | { id: MageEventId, [others: string]: any }
  /**
   * If the `path` option is prenent, the JSON transormation will prefix the
   * `url` property of the observation JSON object with the value of `path`.
   */
  path?: string
}

export type ObservationDocumentProperties = Omit<ObservationFeatureProperties, 'forms'> & {
  forms: ObservationDocumentFormEntry[]
}

export type ObservationDocumentFormEntry = FormEntry & {
  _id: mongoose.Types.ObjectId
}
export type ObservationDocumnetFormEntryJson = Omit<FormEntry, 'id'> & {
  id: ObservationDocumentFormEntry['_id']
}

export type AttachmentDocAttrs = Omit<Attachment, 'id' | 'observationFormId' | 'contentLocator' | 'thumbnails'> & {
  _id: mongoose.Types.ObjectId
  observationFormId: mongoose.Types.ObjectId
  relativePath?: string
  thumbnails: ThumbnailDocAttrs[]
}
export type AttachmentDocument = mongoose.Document & Omit<AttachmentDocAttrs, 'thumbnails'> & {
  thumbnails: ThumbnailDocument[]
}
export type AttachmentDocumentJson = Omit<Attachment, 'id' | 'contentLocator' | 'thumbnails'> & {
  id: AttachmentDocument['_id']
  relativePath?: string
  url?: string
}

export type ThumbnailDocAttrs = Omit<Thumbnail, 'id' | 'contentLocator'> & {
  _id: mongoose.Types.ObjectId
  relativePath?: string
}
export type ThumbnailDocument = mongoose.Document & ThumbnailDocAttrs

export type ObservationDocumentImportantFlag = Omit<ObservationImportantFlag, 'userId'> & {
  userId?: mongoose.Types.ObjectId
}

export type ObservationStateDocument = Omit<mongoose.Document & ObservationState, 'id' | 'userId'> & {
  id: ObservationState['id']
  userId?: mongoose.Types.ObjectId
}
export type ObservationStateDocumentJson = Omit<ObservationState, 'id'> & {
  id: ObservationStateDocument['_id']
  url: string
}

export const ObservationIdSchema: mongoose.Schema
export type ObservationIdDocument = mongoose.Document
export const ObservationId: mongoose.Model<ObservationIdDocument>

export function observationModel(event: Partial<MageEventDocument> & Pick<MageEventDocument, 'collectionName'>): ObservationModel

export interface ObservationReadOptions {
  filter?: {
    geometry?: Geometry
    startDate?: Date
    endDate?: Date
    observationStartDate?: Date
    observationEndDate?: Date
    states?: ObservationState['name'][]
    favorites?: false | { userId?: mongoose.Types.ObjectId }
    important?: boolean
    attachments?: boolean
  }
  sort: any
  fields?: any
  attachments?: boolean
  lean?: boolean
  populate?: boolean
  stream?: false
}
export type ObservationReadStreamOptions = Omit<ObservationReadOptions, 'stream'> & {
  stream: true
}
export function getObservations(event: MageEventDocument, options: ObservationReadOptions, callback: (err: any, results: ObservationDocument[]) => any): void
export function getObservations(event: MageEventDocument, options: ObservationReadStreamOptions): mongoose.QueryCursor<ObservationDocument>

export function updateObservation(event: MageEventDocument, observationId: ObservationId, update: any, callback: (err: any | null, obseration: ObservationDocument) => any): void