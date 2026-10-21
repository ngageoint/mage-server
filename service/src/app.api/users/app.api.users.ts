import { AppResponse, AppRequest, AppRequestContext } from '../app.api.global'
import { InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { User } from '../../entities/users/entities.users'


export type LocalUserProxyEnrollment = Pick<User, 'username' | 'displayName' | 'email' | 'roleId'> & {
  password: string
  phone?: string | undefined
}

export interface EnrollLocalUserByProxyRequest extends AppRequest {
  enrollment: LocalUserProxyEnrollment
}

/**
 * This operation represents the use case in which an admin creates a Mage account
 * on behalf of another user.  The account will implicitly be a "local" Mage
 * identity provider account, with a password hash stored in the Mage database,
 * as opposed to an externally managed IDP account like Google or login.gov.
 */
export interface EnrollLocalUserByProxy {
  (req: EnrollLocalUserByProxyRequest): Promise<AppResponse<ExoUserAccount, PermissionDeniedError | InvalidInputError>>
}

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
  /**
   * TODO: move to web layer
   */
  avatarUrl?: string | null | undefined
}

export interface SearchUsers {
  (req: UserSearchRequest): Promise<AppResponse<PageOf<UserSearchResult>, PermissionDeniedError>>
}

export interface UsersPermissionService {
  ensureReadUsersPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}

export type ExoUserAccount = Omit<User, 'avatar'> & {
  /**
   * TODO: move to web layer
   */
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

/**
 * TODO: move to web layer to compute actual base url
 */
function avatarUrlForUser(user: User): string | undefined {
  if (user.avatar?.relativePath) {
    return `/api/users/${user.id}/avatar`
  }
}
