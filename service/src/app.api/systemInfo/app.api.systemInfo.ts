import { SystemInfo } from '../../entities/systemInfo/entities.systemInfo'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { InfrastructureError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'


export type ExoPrivilegedSystemInfo = SystemInfo
export type ExoRedactedSystemInfo = Omit<SystemInfo, 'environment'>
export type ExoSystemInfo = ExoPrivilegedSystemInfo | ExoRedactedSystemInfo

export interface ReadSystemInfoRequest extends AppRequest {
  context: AppRequestContext<UserWithRole>;
}
export interface ReadSystemInfoResponse extends AppResponse<ExoSystemInfo, InfrastructureError> {}

export interface ReadSystemInfo {
  (req: ReadSystemInfoRequest, isAuthenticated: boolean): Promise<
    ReadSystemInfoResponse
  >;
}

export interface SystemInfoAppLayer {
  readSystemInfo: ReadSystemInfo;
  permissionsService: SystemInfoPermissionService;
}

export interface SystemInfoPermissionService {
  ensureReadSystemInfoPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError>;
}