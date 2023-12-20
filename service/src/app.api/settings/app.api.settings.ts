import { MapSettings } from '../../entities/settings/entities.settings'
import { PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'

export interface UpdateMapSettingsRequest extends AppRequest {
  settings: MapSettings
}

export interface GetSettingsServices {
  (req: AppRequest): Promise<AppResponse<MapSettings | null, PermissionDeniedError>>
}

export interface UpdateSettingsServices {
  (req: UpdateMapSettingsRequest): Promise<AppResponse<MapSettings | null, PermissionDeniedError>>
}

export interface SettingsPermissionService {
  ensureFetchMapSettingsPermissionFor(context: AppRequestContext): Promise<PermissionDeniedError | null>
  ensureUpdateMapSettingsPermissionFor(context: AppRequestContext): Promise<PermissionDeniedError | null>
}
