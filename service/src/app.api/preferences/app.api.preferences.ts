import { EventPreference } from '../../entities/users/entities.users'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { EntityNotFoundError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'

export interface UserPreferencesRequest<Principal = UserWithRole> extends AppRequest<Principal, AppRequestContext<Principal>> {}

export type GetEventPreferencesRequest = UserPreferencesRequest & {
  eventId: number
}

export interface GetEventPreferences {
  (req: GetEventPreferencesRequest): Promise<AppResponse<EventPreference, PermissionDeniedError | InvalidInputError | EntityNotFoundError>>
}

export interface UserPreferencePermissionService {
  ensureGetEventPreferencePermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}
