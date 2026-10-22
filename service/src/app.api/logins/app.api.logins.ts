import { InfrastructureError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { Login } from '../../entities/logins/entities.logins'

export interface LoginRequestContext<Principal = UserWithRole> extends AppRequestContext<Principal> {}

export interface LoginRequest<Principal = UserWithRole> extends AppRequest<Principal, LoginRequestContext<Principal>> {}

export interface ReadLoginsFilter {
  userId?: string
  deviceId?: string | { $in: string[] }
  startDate?: Date
  endDate?: Date
}

export interface ReadLoginsRequest extends LoginRequest {
  filter: ReadLoginsFilter
  limit: number
  lastLoginId?: string | null
  firstLoginId?: string | null
}

export interface ReadLogins {
  (req: ReadLoginsRequest): Promise<AppResponse<Login[], PermissionDeniedError | InfrastructureError>>
}
