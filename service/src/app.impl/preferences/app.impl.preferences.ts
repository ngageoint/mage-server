import * as api from '../../app.api/preferences/app.api.preferences'
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global'
import { EventPreference, UserPreferenceRepository } from '../../entities/users/entities.users'
import { entityNotFound } from '../../app.api/app.api.errors'

export function GetEventPreferences(
  userPreferenceRepository: UserPreferenceRepository,
  permissions: api.UserPreferencePermissionService
): api.GetEventPreferences {
  return async function getEventPreferences(req: api.GetEventPreferencesRequest): ReturnType<api.GetEventPreferences> {
    return await withPermission<EventPreference, KnownErrorsOf<api.GetEventPreferences>>(
      permissions.ensureGetEventPreferencePermission(req.context),
      async () => {
        const user = req.context.requestingPrincipal()
        const eventPreference = await userPreferenceRepository.getEventPreferences(user.id, req.eventId)

        if (!eventPreference) {
          return entityNotFound(req.eventId, 'Event Preference')
        }

        return eventPreference
      }
    )
  }
}
