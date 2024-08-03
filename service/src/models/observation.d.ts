import { Geometry } from 'geojson'
import mongoose from 'mongoose'
import { MageEventAttrs, MageEventId } from '../entities/events/entities.events'
import { Attachment, FormEntry, ObservationAttrs, ObservationFeatureProperties, ObservationId, ObservationImportantFlag, ObservationState, Thumbnail } from '../entities/observations/entities.observations'
import { MageEventDocument } from './event'

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