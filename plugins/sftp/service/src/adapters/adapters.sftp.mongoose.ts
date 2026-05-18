import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events'
import { ObservationId } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import mongoose from 'mongoose';

export enum SftpStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

const SftpObservationsSchema = new mongoose.Schema({
  eventId: { type: Number, required: true },
  observationId: { type: String, required: true },
  status: { type: String, enum: Object.values(SftpStatus), required: true },
  lastObservationModified: { type: Date, required: false }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

SftpObservationsSchema.index({ eventId: 1, observationId: 1 }, { unique: true });

export interface SftpAttrs {
  eventId: MageEventId,
  observationId: ObservationId,
  status: SftpStatus,
  lastObservationModified?: Date,
  createdAt: number,
  updatedAt: number
}

export type SftpDocument = mongoose.Document
export type SftpMongooseModel = mongoose.Model<SftpDocument>
const SftpObservationModelName: string = 'SftpObservation'

export function SftpObservationModel(connection: mongoose.Connection, collectionName: string): SftpMongooseModel {
  return connection.model<SftpDocument>(SftpObservationModelName, SftpObservationsSchema, collectionName)
}

export interface SftpObservationRepository {
  findAll(eventId: MageEventId): Promise<SftpAttrs[]>
  findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<SftpAttrs[]>
  findLatest(eventId: MageEventId): Promise<SftpAttrs | null>
  findLatestSyncedObservationTime(eventId: MageEventId): Promise<Date | null>
  isProcessed(eventId: MageEventId, observationId: ObservationId): Promise<Boolean>
  isSyncedAtLastModified(eventId: MageEventId, observationId: ObservationId, lastModified: Date): Promise<boolean>
  postStatus(eventId: MageEventId, observationId: ObservationId, status: SftpStatus, lastObservationModified?: Date): Promise<SftpAttrs | null>
}

export class MongooseSftpObservationRepository implements SftpObservationRepository {
  readonly model: SftpMongooseModel

  constructor(model: SftpMongooseModel) {
    this.model = model
  }

  async findAll(eventId: MageEventId): Promise<SftpAttrs[]> {
    const documents = await this.model.find({ eventId: eventId })
    return documents.map(document => document.toJSON())
  }

  async findAllByStatus(eventId: MageEventId, status: SftpStatus[]): Promise<SftpAttrs[]> {
    const documents = await this.model.find({ eventId: eventId, status: { $in: status } })
    return documents.map(document => document.toJSON())
  }

  async findLatest(eventId: MageEventId): Promise<SftpAttrs | null> {
    const document = await this.model.findOne({ eventId: eventId }, { updatedAt: true }, { sort: { updatedAt: -1 }, limit: 1 })
    return document ? (document.toJSON() as SftpAttrs) : null
  }

  async findLatestSyncedObservationTime(eventId: MageEventId): Promise<Date | null> {
    const document = await this.model.findOne(
      { eventId: eventId, status: SftpStatus.SUCCESS, lastObservationModified: { $ne: null } },
      {},
      { sort: { lastObservationModified: -1 }, limit: 1 }
    )
    if (!document) return null
    const attrs = document.toJSON() as SftpAttrs
    return attrs.lastObservationModified ? new Date(attrs.lastObservationModified) : null
  }

  async isProcessed(eventId: number, observationId: string): Promise<Boolean> {
    const document = await this.model.findOne({ eventId: eventId, observationId: observationId, status: SftpStatus.SUCCESS }, { limit: 1 })
    return document !== null
  }


  async isSyncedAtLastModified(eventId: MageEventId, observationId: ObservationId, lastModified: Date): Promise<boolean> {
    const document = await this.model.findOne({
      eventId: eventId,
      observationId: observationId,
      status: SftpStatus.SUCCESS,
      lastObservationModified: { $gte: lastModified }
    })
    return document !== null
  }

  async postStatus(eventId: number, observationId: string, status: SftpStatus, lastObservationModified?: Date): Promise<SftpAttrs | null> {
    const update: any = { eventId: eventId, observationId: observationId, status: status }
    if (lastObservationModified) {
      update.lastObservationModified = lastObservationModified
    }
    const document = await this.model.findOneAndUpdate({ eventId: eventId, observationId: observationId }, update, { upsert: true })
    return document ? (document.toJSON() as SftpAttrs) : null
  }

}