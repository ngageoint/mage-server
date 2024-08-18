import { PermissionDeniedError } from '../app.api.errors'
import { AppRequestContext } from '../app.api.global'

export interface DevicePermissionService {
  ensureCreateDevicePermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureReadDevicePermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureUpdateDevicePermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
  ensureDeleteDevicePermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}