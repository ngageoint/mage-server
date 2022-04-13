import mongoose from 'mongoose'
import Observation from '../api/observation'
import { ObservationId } from '../entities/observations/entities.observations'
import { MageEventDocument } from './event'

export type ObservationDocument = mongoose.Document & Omit<Observation, 'eventId'>
export interface ObservationModel extends mongoose.Model<ObservationDocument> {}

export function observationModel(event: Partial<MageEventDocument> & Pick<MageEventDocument, 'collectionName'>): ObservationModel
export function updateObservation(event: MageEventDocument, observationId: ObservationId, update: any, callback: (err: any | null, obseration: ObservationDocument) => any): void