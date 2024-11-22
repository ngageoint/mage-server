import mongoose from 'mongoose'
import { MageEventId } from '../entities/events/entities.events'
import { UserId } from '../entities/users/entities.users'
import { ExportFormat } from '../export'
import { ExportOptions } from '../export/exporter'
import { UserDocument } from './user'

export enum ExportStatus {
  Starting = 'Starting',
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
}

export type ExportErrorAttrs = {
  type: string,
  message: string,
  createdAt: Date,
  updatedAt: Date,
}

export type ExportId = string

export type ExportAttrs = {
  id: ExportId
  userId: UserId
  relativePath?: string
  filename?: string
  exportType: ExportFormat
  status?: ExportStatus
  options: {
    eventId: MageEventId
    filter: any
  },
  processingErrors?: ExportErrorAttrs[]
  expirationDate: Date
  lastUpdated: Date
}

export type ExportDocument = Omit<ExportAttrs, 'id' | 'userId'> & {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
}

export type ExportModelInstance = mongoose.HydratedDocument<ExportDocument>

export type ExportModelInstancePopulated = Omit<ExportModelInstance, 'userId' | 'options'> & {
  // TODO: users-next
  userId: UserDocument | null,
  options: Omit<ExportOptions, 'eventId'> & {
    event: { _id: number, name: string }
  }
}

export type PopulateQueryOption = { populate: true }

export function createExport(spec: Pick<ExportAttrs, 'userId' | 'options' | 'exportType'>): Promise<ExportModelInstance>
export function getExportById(id: mongoose.Types.ObjectId | ExportId): Promise<ExportModelInstance | null>
export function getExportById(id: mongoose.Types.ObjectId | ExportId, options: PopulateQueryOption): Promise<ExportModelInstancePopulated | null>
export function getExportsByUserId(userId: UserId): Promise<ExportModelInstance[]>
export function getExportsByUserId(userId: UserId, options: PopulateQueryOption): Promise<ExportModelInstancePopulated[]>
export function getExports(): Promise<ExportModelInstance[]>
export function getExports(options: PopulateQueryOption): Promise<ExportModelInstance[]>
export function count(options?: { filter: any }): Promise<number>
export function updateExport(id: ExportId, spec: Partial<ExportAttrs>): Promise<ExportModelInstance | null>
export function removeExport(id: ExportId): Promise<ExportModelInstance | null>

