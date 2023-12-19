import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import mongoose from 'mongoose';

export enum SftpStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

const SftpObservationsSchema = new mongoose.Schema({
  eventId: { type: Number, required: true, unique: true },
  observationId: { type: String, required: true },
  status: { type: String, enum: Object.values(SftpStatus), required: true }
},{
  timestamps: { createdAt: 'createdAt',updatedAt: 'updatedAt' }
});

export interface SftpAttrs {
  eventId: MageEventId,
  observationId: ObservationId,
  status: SftpStatus,
  createdAt: number,
  updatedAt: number
}

export type SftpDocument = mongoose.Document
export type SftpMongooseModel = mongoose.Model<SftpDocument>
const SftpObservationModelName: string = 'SftpObservation'

export function SftpObservationModel(connection: mongoose.Connection, collectionName: string): SftpMongooseModel {
  return connection.model(SftpObservationModelName, SftpObservationsSchema, collectionName)
}

export interface SftpObservationRepository {
  findAll(eventId: MageEventId): Promise<SftpAttrs[]>
  findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<SftpAttrs[]>
  findLatest(eventId: MageEventId): Promise<SftpAttrs | null>
  isProcessed(eventId: MageEventId, observationId: ObservationId): Promise<Boolean>
  postStatus(eventId: MageEventId, observationId: ObservationId, status: SftpStatus): Promise<SftpAttrs | null>
}

export class MongooseSftpObservationRepository implements SftpObservationRepository {
  readonly model: SftpMongooseModel

  constructor(model: SftpMongooseModel) {
    this.model = model
  }

  async findAll(eventId: MageEventId): Promise<SftpAttrs[]> {
    const documents = await this.model.find({eventId: eventId})
    return documents.map(document => document.toJSON())
  }

  async findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<SftpAttrs[]> {
    const documents = await this.model.find({eventId: eventId, status: { $in: status}})
    return documents.map(document => document.toJSON())
  }

  async findLatest(eventId: MageEventId): Promise<SftpAttrs | null> {
    const document =  await this.model.findOne({ eventId: eventId }, { updatedAt: true }, { sort: { updatedAt: -1 }, limit: 1 })
    return document ? document.toJSON() : null
  }

  async isProcessed(eventId: number, observationId: string): Promise<Boolean> {
    const document = await this.model.findOne({ eventId: eventId, observationId: observationId, status: SftpStatus.SUCCESS }, { limit: 1 })
    return document !== null
  }

  async postStatus(eventId: number, observationId: string, status: SftpStatus): Promise<SftpAttrs | null> {
    const document = await this.model.findOneAndUpdate({ eventId: eventId, observationId: observationId }, { eventId: eventId, observationId: observationId, status: status }, { upsert: true })
    return document ? document.toJSON() : null
  }

}