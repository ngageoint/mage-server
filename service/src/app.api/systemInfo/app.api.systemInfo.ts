import { SystemInfo } from '../../entities/systemInfo/entities.systemInfo'
import { InfrastructureError } from '../app.api.errors'
import { AppRequest, AppResponse } from '../app.api.global'


export type ExoPrivilegedSystemInfo = SystemInfo
export type ExoRedactedSystemInfo = Omit<SystemInfo, 'environment'>
export type ExoSystemInfo = ExoPrivilegedSystemInfo | ExoRedactedSystemInfo

export interface ReadSystemInfoRequest extends AppRequest {}
export interface ReadSystemInfoResponse extends AppResponse<ExoSystemInfo, InfrastructureError> {}

export interface ReadSystemInfo {
  (req: ReadSystemInfoRequest): Promise<ReadSystemInfoResponse>
}

export interface SystemInfoAppLayer {
  readSystemInfo: ReadSystemInfo
}