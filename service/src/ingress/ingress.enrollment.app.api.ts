import {
  EntityNotFoundError,
  EntityNotUniqueError,
  InfrastructureError,
  InvalidInputError,
  PermissionDeniedError
} from '../app.api/app.api.errors'
import { AppRequest, AppResponse } from '../app.api/app.api.global'
import { Role } from '../entities/authorization/entities.authorization'
import { User } from '../entities/users/entities.users'
import { LocalIdpAccount } from '../local-idp/local-idp.entities'
import { IdentityProvider } from './ingress.entities'

export type ExoUserAccount = Omit<User, 'avatar'> & {
  /**
   * TODO: move to web layer
   */
  avatarUrl?: string
}

export type RedactedLocalIdpAccount = Omit<LocalIdpAccount, 'hashedPassword' | 'previousHashedPasswords'>

/**
 * This type joins a user account with associated authentication and authorization
 * information for admin user management use cases.
 * TODO: support multiple identity providers eventually
 */
export type ExoUserEnrollmentResult = {
  account: User
  authentication: {
    identityProvider: IdentityProvider
    /**
     * If the user has a local identity, include that information so an admin can
     * view and modify local IDP security status.
     */
    local?: RedactedLocalIdpAccount
  }
  authorization: {
    role: Role
    // TODO: other permissions and access control info
  }
}

export type LocalUserProxyEnrollmentAccount = Pick<User, 'username' | 'displayName' | 'email' | 'roleId'> & {
  password: string
  phone?: string | undefined
}

export interface EnrollLocalUserByProxyRequest extends AppRequest {
  account: LocalUserProxyEnrollmentAccount
}

/**
 * This operation represents the use case in which an admin creates a Mage account
 * on behalf of another user.  The account will implicitly be a "local" Mage
 * identity provider account, with a password hash stored in the Mage database,
 * as opposed to an externally managed IDP account like Google or login.gov.
 * Return a composite object comprising the created Mage user account, the
 * authentication information, including the local IDP account, and the authorization
 * role and permissions.
 */
export interface EnrollLocalUserByProxy {
  (req: EnrollLocalUserByProxyRequest): Promise<AppResponse<ExoUserEnrollmentResult, PermissionDeniedError | EntityNotUniqueError | InvalidInputError | EntityNotFoundError | InfrastructureError>>
}
