import * as api from '../../app.api/settings/app.api.settings'
import { AppRequest, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import { MapSettings, SettingRepository } from '../../entities/settings/entities.settings'
import { UpdateMapSettingsRequest } from '../../app.api/settings/app.api.settings'

export function FetchMapSettings(settingRepo: SettingRepository, permissionService: api.SettingsPermissionService): api.GetSettingsServices {
  return async function getMapSettings(req: AppRequest): ReturnType<api.GetSettingsServices> {
    return await withPermission<MapSettings | null, KnownErrorsOf<api.GetSettingsServices>>(
      permissionService.ensureFetchMapSettingsPermissionFor(req.context),
      async (): Promise<MapSettings | null> => {
        return await settingRepo.getMapSettings()
      }
    )
  }
}

export function UpdateMapSettings(settingRepo: SettingRepository, permissionService: api.SettingsPermissionService): api.UpdateSettingsServices {
  return async function updateMapSettings(req: UpdateMapSettingsRequest): ReturnType<api.UpdateSettingsServices> {
    return await withPermission<MapSettings | null, KnownErrorsOf<api.UpdateSettingsServices>>(
      permissionService.ensureUpdateMapSettingsPermissionFor(req.context),
      async (): Promise<MapSettings | null> => {
        return await settingRepo.updateMapSettings(req.settings)
      }
    )
  }
}