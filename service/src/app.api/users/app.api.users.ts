import { AppResponse, AppRequest, AppRequestContext } from '../app.api.global'
import { EntityNotFoundError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { PageOf, PagingParameters } from '../../entities/entities.global'
import { User, UserExpanded, UserId } from '../../entities/users/entities.users'


export interface CreateUserRequest extends AppRequest {

}

export interface CreateUserOperation {
  (req: CreateUserRequest): Promise<AppResponse<UserExpanded, PermissionDeniedError | InvalidInputError>>
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
}

export interface SearchUsers {
  (req: UserSearchRequest): Promise<AppResponse<PageOf<UserSearchResult>, PermissionDeniedError>>
}

export interface ReadMyAccountRequest extends AppRequest<User> {}

export interface ReadMyAccountOperation {
  (req: ReadMyAccountRequest): Promise<AppResponse<User, PermissionDeniedError>>
}

export interface UpdateMyAccountRequest extends AppRequest<User> {}

export interface UpdateMyAccountOperation {
  (req: UpdateMyAccountRequest): Promise<AppResponse<UserExpanded, PermissionDeniedError | InvalidInputError>>
}

export interface DisableUserRequest extends AppRequest {
  userId: UserId
}

export interface DisableUserOperation {
  (req: DisableUserOperation): Promise<AppResponse<void, PermissionDeniedError | EntityNotFoundError>>
}

export interface RemoveUserRequest extends AppRequest {
  userId: UserId
}

export interface RemoveUserOperation {
  (req: RemoveUserRequest): Promise<AppResponse<UserExpanded, PermissionDeniedError | EntityNotFoundError>>
}

export interface UsersPermissionService {
  ensureReadUsersPermission(context: AppRequestContext): Promise<null | PermissionDeniedError>
}