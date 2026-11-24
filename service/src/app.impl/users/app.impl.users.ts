import { PageOf } from '../../entities/entities.global'
import { UserRepository } from '../../entities/users/entities.users'
import { KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import * as api from '../../app.api/users/app.api.users'

export function createSearchUsersOperation(userRepo: UserRepository, permissions: api.UsersPermissionService): api.SearchUsers {
  return async function searchUsers(req: api.UserSearchRequest): ReturnType<api.SearchUsers> {
    return await withPermission<PageOf<api.UserSearchResult>,KnownErrorsOf<api.SearchUsers>>(
      permissions.ensureReadUsersPermission(req.context),
      async (): Promise<PageOf<api.UserSearchResult>> => {
        return await userRepo.find<api.UserSearchResult>(req.userSearch, x => api.searchResultFor(x));
      }
    )
  }
}
