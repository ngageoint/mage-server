import { SystemInfo } from '../../entities/systemInfo/entities.systemInfo'
import { AnonymousUser, UserWithRole } from '../../permissions/permissions.role-based.base'
import { InfrastructureError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'

export const ApiVersion = {
  major: 6,
  minor: 6,
  patch: 0
}

export type ExoPrivilegedSystemInfo = SystemInfo
export type ExoRedactedSystemInfo = Omit<SystemInfo, 'environment'>
export type ExoSystemInfo = ExoPrivilegedSystemInfo | ExoRedactedSystemInfo

export interface ReadSystemInfoRequest extends AppRequest<UserWithRole | AnonymousUser> {}
export interface ReadSystemInfoResponse extends AppResponse<ExoSystemInfo, InfrastructureError> {}

export interface ReadSystemInfo {
  (req: ReadSystemInfoRequest): Promise<ReadSystemInfoResponse>
}

export interface SystemInfoAppLayer {
  readSystemInfo: ReadSystemInfo
  permissionsService: SystemInfoPermissionService
}

export interface SystemInfoPermissionService {
  ensureReadSystemInfoPermission(context: AppRequestContext<UserWithRole | AnonymousUser>): Promise<null | PermissionDeniedError>
}