import * as api from '../../app.api/users/app.api.users';
import { UserRepository } from '../../entities/users/entities.users';
import { withPermission, KnownErrorsOf } from '../../app.api/app.api.global';
import { PageOf } from '../../entities/entities.global';

export function SearchUsers(
  userRepo: UserRepository,
  permissions: api.UsersPermissionService
): api.SearchUsers {
  return async function searchUsers(
    req: api.UserSearchRequest
  ): ReturnType<api.SearchUsers> {
    // Use the buildFilter function to construct the filter
    const userSearch: api.UserSearchRequest['userSearch'] = buildFilter(
      req.userSearch
    );

    // Continue with the rest of the logic, including the search operation
    return await withPermission<
      PageOf<api.UserSearchResult>,
      KnownErrorsOf<api.SearchUsers>
    >(
      permissions.ensureReadUsersPermission(req.context),
      async (): Promise<PageOf<api.UserSearchResult>> => {
        const page = await userRepo.find<api.UserSearchResult>(
          userSearch,
          x => {
            return {
              id: x.id,
              username: x.username,
              displayName: x.displayName,
              email: x.email,
              active: x.active,
              enabled: x.enabled,
              allPhones: x.phones.reduce((allPhones, phone, index) => {
                return index === 0
                  ? `${phone.number}`
                  : `${allPhones}; ${phone.number}`;
              }, '')
            };
          }
        );
        return page;
      }
    );
  };
}

// Function to abstract parameter handling and filter building
function buildFilter(userSearch: api.UserSearchRequest['userSearch']): api.UserSearchRequest['userSearch'] {
  const filter: api.UserSearchRequest['userSearch'] = {
    nameOrContactTerm: userSearch.nameOrContactTerm,
    pageSize: userSearch.pageSize || 250,
    pageIndex: userSearch.pageIndex || 0,
    includeTotalCount: userSearch.includeTotalCount,
  };

  return filter;
}
