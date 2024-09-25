import { InvalidInputError, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequest, AppResponse } from '../app.api/app.api.global'
import { Avatar, User, UserIcon } from '../entities/users/entities.users'


export interface EnrollMyselfRequest {
  username: string
  password: string
  displayName: string
  phone?: string | null
  email?: string | null
}

/**
 * Create the given account in the local identity provider.
 */
export interface EnrollMyselfOperation {
  (req: EnrollMyselfRequest): Promise<AppResponse<User, InvalidInputError>>
}

export interface CreateUserRequest extends AppRequest {
  user: Omit<User, 'id' | 'icon' | 'avatar' | 'authenticationId' | 'active' | 'enabled'>
  password: string
  icon?: UserIcon & { content: NodeJS.ReadableStream | Buffer }
  avatar?: Avatar & { content: NodeJS.ReadableStream | Buffer }
}

/**
 * Manually create an account on behalf of another user using the Mage local IDP.  This is the use case of an admin
 * creating an account for another user.
 */
export interface CreateUserOperation {
  (req: CreateUserRequest): Promise<AppResponse<User, InvalidInputError | PermissionDeniedError>>
}
