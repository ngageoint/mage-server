import { TeamsPermissionService } from '../app.api/teams/app.api.teams'
import { AppRequestContext } from '../app.api/app.api.global'
import { TeamPermission } from '../entities/authorization/entities.permissions'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'
import { PermissionDeniedError } from '../app.api/app.api.errors'


export class RoleBasedTeamsPermissionService implements TeamsPermissionService {
  async ensureReadTeamsPermission(context: AppRequestContext<UserWithRole>): Promise<null | PermissionDeniedError> {
    return ensureContextUserHasPermission(context, TeamPermission.READ_TEAM)
  }
}
