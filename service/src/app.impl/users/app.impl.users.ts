import * as api from '../../app.api/users/app.api.users';
import { UserRepository } from '../../entities/users/entities.users';
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global';
import { PageOf } from '../../entities/entities.global';

export function SearchUsers(userRepo: UserRepository,permissions: api.UsersPermissionService
): api.SearchUsers {
  return async function searchUsers(req: api.UserSearchRequest): ReturnType<api.SearchUsers> {
    return await withPermission<PageOf<api.UserSearchResult>,KnownErrorsOf<api.SearchUsers>>(
      permissions.ensureReadUsersPermission(req.context),
      async (): Promise<PageOf<api.UserSearchResult>> => {
        const page = await userRepo.find<api.UserSearchResult>(req.userSearch, x => api.searchResultFor(x));
        return page;
      }
    );
  };
}