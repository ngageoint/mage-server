import { AppResponse, AppRequest, AppRequestContext } from '../app.api.global'
import { PermissionDeniedError } from '../app.api.errors'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { User } from '../../entities/users/entities.users'


export interface UserSearchRequest extends AppRequest {
  userSearch: PagingParameters & {
    nameOrContactTerm?: string | undefined,
    active?: boolean | undefined,
    enabled?: boolean | undefined,
  }
}

export type UserSearchResult = Pick<User, 'id' | 'username' | 'displayName' | 'email' | 'active' | 'enabled'> & {
  /**
   * A reduction of all the phone numbers to a single string
   */
  allPhones?: string | null | undefined
  avatarUrl?: string | null | undefined
}

export interface SearchUsers {
  (req: UserSearchRequest): Promise<AppResponse<PageOf<UserSearchResult>, PermissionDeniedError>>
}

export interface UsersPermissionService {
  ensureReadUsersPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}

export type ExoUser = Omit<User, 'avatar'> & {
  avatarUrl?: string
}

export function searchResultFor(from: User): UserSearchResult {
  return {
    id: from.id,
    username: from.username,
    displayName: from.displayName,
    email: from.email,
    active: from.active,
    enabled: from.enabled,
    avatarUrl: avatarUrlForUser(from),
    allPhones: from.phones.reduce((allPhones, phone, index) => {
      return index === 0
        ? `${phone.number}`
        : `${allPhones}; ${phone.number}`;
    }, '')
  };
}

function avatarUrlForUser(user: User): string | undefined {
  if (user.avatar?.relativePath) {
    return `/api/users/${user.id}/avatar`
  }
}
