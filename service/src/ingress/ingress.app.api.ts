import { EntityNotFoundError, InfrastructureError, InvalidInputError, MageError, PermissionDeniedError } from '../app.api/app.api.errors'
import { AppRequest, AppResponse } from '../app.api/app.api.global'
import { Avatar, User, UserExpanded, UserIcon } from '../entities/users/entities.users'
import { IdentityProviderUser } from './ingress.entities'



export interface EnrollMyselfRequest {
  username: string
  password: string
  displayName: string
  phone?: string | null
  email?: string | null
}

/**
 * Create the given account for the requesting user in the local identity provider.
 */
export interface EnrollMyselfOperation {
  (req: EnrollMyselfRequest): Promise<AppResponse<UserExpanded, InvalidInputError>>
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

export interface AdmitFromIdentityProviderRequest {
  identityProviderName: string
  identityProviderUser: IdentityProviderUser
}

export interface AdmitFromIdentityProviderResult {
  mageAccount: UserExpanded
  admissionToken: string
}

/**
 * Admit a user that has authenticated with a configured identity provider.  User admission includes implicit user
 * enrollment, i.e., when the Mage account does not exist, create a new Mage account for the user bound to the
 * authenticating identity provider, and apply the enrollment policy configured for the identity provider.
 */
export interface AdmitFromIdentityProviderOperation {
  (req: AdmitFromIdentityProviderRequest): Promise<AppResponse<AdmitFromIdentityProviderResult, EntityNotFoundError | AuthenticationFailedError | InfrastructureError>>
}

export interface UpdateIdentityProviderRequest {

}

export interface UpdateIdentityProviderResult {

}

export interface UpdateIdentityProviderOperation {
  (req: UpdateIdentityProviderRequest): Promise<AppResponse<UpdateIdentityProviderResult, PermissionDeniedError | EntityNotFoundError>>
}

export interface DeleteIdentityProviderRequest {

}

export interface DeleteIdentityProviderResult {

}

export interface DeleteIdentityProviderOperation {
  (req: DeleteIdentityProviderRequest): Promise<AppResponse<DeleteIdentityProviderResult, PermissionDeniedError | EntityNotFoundError>>
}

export const ErrAuthenticationFailed = Symbol.for('MageError.Ingress.AuthenticationFailed')
export type AuthenticationFailedErrorData = { username: string, identityProviderName: string }
export type AuthenticationFailedError = MageError<typeof ErrAuthenticationFailed, AuthenticationFailedErrorData>
export function authenticationFailedError(username: string, identityProviderName: string, message?: string): AuthenticationFailedError {
  return new MageError(ErrAuthenticationFailed, { username, identityProviderName }, message || `Authentication failed: ${username} @(${identityProviderName})`)
}