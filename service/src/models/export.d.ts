import mongoose from 'mongoose'
import { MageEventId } from '../entities/events/entities.events'
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

export type ExportAttrs = {
  userId: mongoose.Types.ObjectId,
  relativePath?: string,
  filename?: string,
  exportType: ExportFormat,
  status?: ExportStatus,
  options: {
    eventId: MageEventId,
    filter: any
  },
  processingErrors?: ExportErrorAttrs[],
  expirationDate: Date,
  lastUpdated: Date,
}

export type ExportDocument = ExportAttrs & mongoose.Document

export type ExportDocumentPopulated = Omit<ExportDocument, 'userId' | 'options'> & {
  userId: UserDocument | null,
  options: Omit<ExportOptions, 'eventId'> & {
    event: { _id: number, name: string }
  }
}

export type PopulateQueryOption = { populate: true }

export function createExport(spec: Pick<ExportAttrs, 'userId' | 'options' | 'exportType'>): Promise<ExportDocument>
export function getExportById(id: mongoose.Types.ObjectId | string): Promise<ExportDocument | null>
export function getExportById(id: mongoose.Types.ObjectId | string, options: PopulateQueryOption): Promise<ExportDocumentPopulated | null>
export function getExportsByUserId(userId: mongoose.Types.ObjectId): Promise<ExportDocument[]>
export function getExportsByUserId(userId: mongoose.Types.ObjectId, options: PopulateQueryOption): Promise<ExportDocumentPopulated[]>
export function getExports(): Promise<ExportDocument[]>
export function getExports(options: PopulateQueryOption): Promise<ExportDocument[]>
export function count(options?: { filter: any }): Promise<number>
export function updateExport(id: mongoose.Types.ObjectId, spec: Partial<ExportAttrs>): Promise<ExportDocument | null>
export function removeExport(id: mongoose.Types.ObjectId | string): Promise<ExportDocument | null>

