import {
  LocalIdpAccount,
  LocalIdpAccountLockedError,
  LocalIdpAccountNotFoundError,
  LocalIdpAuthenticationResult,
  LocalIdpCredentials, LocalIdpDuplicateUsernameError, LocalIdpInvalidAccountLockPolicyError, LocalIdpInvalidPasswordError,
  LocalIdpPasswordMismatchError, LocalIdpSecurityPolicy
} from './local-idp.entities'


export type LocalIdpError =
  | LocalIdpAccountLockedError
  | LocalIdpAccountNotFoundError
  | LocalIdpDuplicateUsernameError
  | LocalIdpInvalidAccountLockPolicyError
  | LocalIdpInvalidPasswordError
  | LocalIdpPasswordMismatchError

export interface MageLocalIdentityProviderService {
  readSecurityPolicy(): Promise<LocalIdpSecurityPolicy>
  /**
   * Return an error without saving if the given policy is invalid.
   */
  saveSecurityPolicy(policy: LocalIdpSecurityPolicy): Promise<LocalIdpSecurityPolicy | LocalIdpInvalidAccountLockPolicyError>
  createAccount(credentials: LocalIdpCredentials): Promise<LocalIdpAccount | LocalIdpError>
  /**
   * Return `null` if no account for the given username exists.
   */
  deleteAccount(username: string): Promise<LocalIdpAccount | null>
  /**
   * Return `null` if no account for the given username exists.  If authentication fails, update the corresponding
   * account according to the service's account lock policy.
   */
  authenticate(credentials: LocalIdpCredentials): Promise<LocalIdpAuthenticationResult | null>
}
