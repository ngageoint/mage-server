import * as api from '../../app.api/settings/app.api.settings'
import { AppRequest, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import { Logger, NoopLogger } from '../../entities/entities.logging'
import { MapSettings, SettingRepository } from '../../entities/settings/entities.settings'
import { UpdateMapSettingsRequest } from '../../app.api/settings/app.api.settings'

export function FetchMapSettings(settingRepo: SettingRepository, permissionService: api.SettingsPermissionService, log: Logger = NoopLogger): api.GetSettingsServices {
  return async function getMapSettings(req: AppRequest): ReturnType<api.GetSettingsServices> {
    return await withPermission<MapSettings | null, KnownErrorsOf<api.GetSettingsServices>>(
      permissionService.ensureFetchMapSettingsPermissionFor(req.context),
      async (): Promise<MapSettings | null> => {
        log.debug('fetching map settings', { user: principalIdentifier(req) })
        return await settingRepo.getMapSettings()
      }
    )
  }
}

export function UpdateMapSettings(settingRepo: SettingRepository, permissionService: api.SettingsPermissionService, log: Logger = NoopLogger): api.UpdateSettingsServices {
  return async function updateMapSettings(req: UpdateMapSettingsRequest): ReturnType<api.UpdateSettingsServices> {
    const user = principalIdentifier(req)
    const res = await withPermission<MapSettings | null, KnownErrorsOf<api.UpdateSettingsServices>>(
      permissionService.ensureUpdateMapSettingsPermissionFor(req.context),
      async (): Promise<MapSettings | null> => {
        const updated = await settingRepo.updateMapSettings(req.settings)
        log.info('updated map settings', {
          user,
          webSearchType: req.settings.webSearchType,
          mobileSearchType: req.settings.mobileSearchType,
        })
        return updated
      }
    )
    if (res.error) {
      log.warn('map settings update failed', { user, error: res.error.message })
    }
    return res
  }
}

function principalIdentifier(req: AppRequest): string {
  const principal = req.context.requestingPrincipal() as { id?: unknown, username?: unknown } | null | undefined
  if (principal && typeof principal === 'object') {
    return String(principal.username ?? principal.id ?? 'unknown')
  }
  return 'unknown'
}
