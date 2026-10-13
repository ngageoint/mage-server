import { infrastructureError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/logins/app.api.logins'
import { UsersPermissionService } from '../../app.api/users/app.api.users'
import { LoginRepository } from '../../entities/logins/entities.logins'

/**
 * Reuses UsersPermissionService's READ_USER check rather than defining a
 * separate LoginPermissionService
 */
export function ReadLogins(
  permissionService: UsersPermissionService,
  repo: LoginRepository
): api.ReadLogins {
  return async function readLogins(req: api.ReadLoginsRequest): ReturnType<api.ReadLogins> {
    const denied = await permissionService.ensureReadUsersPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    try {
      const logins = await repo.findMany(req.filter, {
        limit: req.limit,
        lastLoginId: req.lastLoginId,
        firstLoginId: req.firstLoginId
      })
      return AppResponse.success(logins)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}
