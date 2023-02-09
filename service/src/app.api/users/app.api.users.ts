import { AppResponse, AppRequest, AppRequestContext } from '../app.api.global'
import { PermissionDeniedError, InvalidInputError } from '../app.api.errors'
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
}

export interface SearchUsers {
  (req: UserSearchRequest): Promise<AppResponse<PageOf<UserSearchResult>, PermissionDeniedError>>
}

export interface UsersPermissionService {
  ensureReadUsersPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}