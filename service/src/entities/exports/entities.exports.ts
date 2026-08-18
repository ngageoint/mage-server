import { MageEventId } from "../events/entities.events"
import { User, UserId } from '../users/entities.users'
import { Stats } from "fs"

export type ExportId = string

export enum ExportStatus {
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed'
}

export const EXPORT_FORMATS = ["kml", "geojson", "geopackage", "csv"] as const;
export type ExportFormat = typeof EXPORT_FORMATS[number];

export type ExportItemSummary = {
  count?: number
  startTimestamp?: Date
  endTimestamp?: Date
}

export interface ExportOptions {
  eventId: MageEventId
  filter?: ExportFilter
  projection?: ExportProjection
}

export type ExportProjection  = ExportFormProjection[]

export interface ExportFormProjection {
  formId: number,
  fields: ExportFieldProjection[]
}

export type ExportFieldProjection = string

export interface ExportFilter {
  exportObservations?: boolean
  exportLocations?: boolean
  startDate?: Date
  endDate?: Date
  favorites?: false | { userId: string }
  important?: boolean
  includeAttachments?: boolean
}

export type ExportError = {
  type: string,
  message: string,
  createdAt: Date,
  updatedAt: Date
}

export type Export = {
  id: ExportId,
  userId: UserId,
  relativePath?: string,
  filename?: string,
  size?: number,
  exportType: ExportFormat,
  status?: ExportStatus,
  options: ExportOptions,
  processingErrors?: ExportError[],
  expirationDate: Date,
  lastUpdated: Date,
  summary: {
    observations?: ExportItemSummary,
    locations?: ExportItemSummary
  }
}

export type ExportExpanded = Export & {
  user: Pick<User, 'id'> & Partial<Pick<User, | 'username' | 'displayName'>>,
  options: ExportOptions & {
    event: { id: MageEventId, name: string}
  }
}

export type ExportSummary = {
  observations?: ExportItemSummary
  locations?: ExportItemSummary
}

export type ExportCreateAttrs = {
  userId: string,
  eventId: MageEventId,
  format: ExportFormat,
  filter: Omit<ExportFilter, 'favorites'> & {
    favorites?: boolean
  },
  projection?: ExportProjection
  status?: ExportStatus,
  relativePath?: string,
  filename?: string
}

export interface ExportsRepository {
  getExports(): Promise<Export[]>
  updateExport(exportId: ExportId, attrs: Partial<Export>): Promise<Export | null>
  getExportForUser(exportId: ExportId, userId: UserId): Promise<ExportExpanded | null>
  getExportsForUser(userId: string): Promise<ExportExpanded[]>
  createExport(attrs: ExportCreateAttrs): Promise<ExportExpanded>
  updateExportForUser(exportId: ExportId, userId: UserId, attrs: Partial<Export>): Promise<ExportExpanded | null>
  deleteExport(exportId: ExportId): Promise<Export | null>
  deleteExportForUser(id: ExportId, userId: UserId): Promise<Export | null>
}

export type ExportContent = {
  relativePath: string,
  content: NodeJS.WritableStream
}

export interface ExportStore {
  /**
   * Save the given content to the store for the specified export.
   * Return `null` if the save succeeded and no change to the
   * export was necessary.  Return an {@link ExportStoreError} if the
   * save failed.
   */
  writeContent(exp: Export): ExportContent

  /**
   * Return a read stream of the content for the given export.
   * Return `null` if no content exists for the given export.
   * Return an `ExportStoreError` if an error occurred reading
   * from the underlying storage.
   */
  readContent(exp: Export): Promise<NodeJS.ReadableStream | null | ExportStoreError>

  contentStats(exp: Export): Promise<Stats | null | ExportStoreError>

  /**
   * Delete the given export's content.
   */
  deleteContent(exp: Export): Promise<void | ExportStoreError>
}

export class ExportStoreError extends Error {

  static invalidExportId(exportId: string): ExportStoreError {
    return new ExportStoreError(ExportStoreErrorCode.InvalidExportId, `export ${exportId} not found`)
  }

  constructor(readonly errorCode: ExportStoreErrorCode, message?: string) {
    super(message)
    this.name = errorCode
  }
}

export enum ExportStoreErrorCode {
  /**
   * The given export ID was not found
   */
  InvalidExportId = 'ExportStoreError.InvalidExportId',
  /**
   * The content for the given export ID was not found in the export store.
   */
  ContentNotFound = 'ExportStoreError.ContentNotFound',
  /**
   * The underlying storage system, e.g. file system, raised an error during
   * some I/O operation.
   */
  StorageError = 'ExportStoreError.StorageError'
}

export interface IconStyle {
  eventStyle: string,
  formStyle?: string,
  primaryStyle?: string,
  secondaryStyle?: string
}
