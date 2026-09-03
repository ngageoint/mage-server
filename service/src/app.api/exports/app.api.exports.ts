import { Archiver } from 'archiver'
import { MageEvent } from '../../entities/events/entities.events'
import {
  Export, ExportExpanded,
  ExportLocationFilter,
  ExportObservationFilter,
  ExportFormat,
  ExportProjection,
  ExportSummary,
} from '../../entities/exports/entities.exports'
import { FindObservationsStreamSpec } from '../../entities/observations/entities.observations'
import { FindUserLocationsStreamSpec } from '../../entities/locations/entities.locations'
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
  filter: {
    observations?: Omit<ExportObservationFilter, 'favorites'> & { favorites?: boolean }
    locations?: ExportLocationFilter
  }
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

export interface ExportFactory {
  (format: ExportFormat): ExportTransform | null
}

export interface ObservationExportParams {
  findSpec: FindObservationsStreamSpec
  projection?: ExportProjection
}

export interface LocationExportParams {
  findSpec: FindUserLocationsStreamSpec
}

export interface ExportParams {
  observationParams?: ObservationExportParams
  locationParams?: LocationExportParams
}

export interface ExportTransform {
  export(event: MageEvent, archive: Archiver, params: ExportParams): Promise<ExportSummary>
}
