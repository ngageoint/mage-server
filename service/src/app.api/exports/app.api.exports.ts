import { Archiver } from 'archiver'
import { MageEvent } from '../../entities/events/entities.events'
import {
  Export, ExportExpanded,
  ExportFilter,
  ExportFormat,
  ExportOptions,
  ExportProjection,
  ExportSummary,
  IconStyle
} from '../../entities/exports/entities.exports'
import { FormEntry, Observation, ObservationAttrs } from '../../entities/observations/entities.observations'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'

export interface GetExportsRequest extends AppRequest<UserWithRole> {}

export interface GetExports {
  (req: GetExportsRequest): Promise<AppResponse<ExportExpanded[], PermissionDeniedError>>
}

export interface ExportContentResponse {
  export: Export
  bytes: NodeJS.ReadableStream
}

export interface GetExportContent {
  (req: GetExportContentRequest): Promise<AppResponse<ExportContentResponse, PermissionDeniedError | EntityNotFoundError | InfrastructureError>>
}

export interface GetExportContentRequest<Principal = UserWithRole> extends AppRequest<Principal, AppRequestContext<Principal>> {
  exportId: string
}

export interface CreateExportRequestContext<Principal = UserWithRole> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
}

export interface ExportRequest<Principal = UserWithRole> extends AppRequest<Principal, CreateExportRequestContext<Principal>> {}

export type ExportCreateParams = {
  format: ExportFormat
  filter: Omit<ExportFilter, 'favorites'> & {
    favorites?: boolean
  },
  projection?: ExportProjection
}

export type CreateExportRequest<Principal = UserWithRole> = AppRequest<Principal, CreateExportRequestContext<Principal>> & ExportCreateParams;

export interface CreateExport {
  (req: CreateExportRequest): Promise<AppResponse<Export, PermissionDeniedError | InvalidInputError >>
}

export interface DeleteExportRequest<Principal = UserWithRole> extends AppRequest<Principal, AppRequestContext<Principal>> {
  exportId: string
}

export interface DeleteExport {
  (req: DeleteExportRequest): Promise<AppResponse<Export, PermissionDeniedError | EntityNotFoundError >>
}

export interface ExportAppLayerPermissionService {
  ensureCreateExportPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureGetMyExportPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureGetMyExportContentPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError>
  ensureDeleteMyExportPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}

export type GetIconStyle = (event: MageEvent, observation: Observation) => IconStyle
export type ObservationFormFieldProjection = (observation: ObservationAttrs, projection?: ExportProjection) => FormEntry[]

export interface ExportFactory {
  (format: ExportFormat): ExportTransform | null
}

export interface ExportTransform {
  export(
    event: MageEvent,
    options: Omit<ExportOptions, 'eventId'>,
    fieldProjection: ObservationFormFieldProjection,
    archive: Archiver
  ): Promise<ExportSummary>
}
