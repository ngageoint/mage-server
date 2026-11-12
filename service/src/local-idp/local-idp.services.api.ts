import {
  LocalIdpAccount,
  LocalIdpAccountLockedError,
  LocalIdpAccountNotFoundError,
  LocalIdpAuthenticationResult,
  LocalIdpCredentials, LocalIdpDuplicateUsernameError, LocalIdpInvalidPasswordError, LocalIdpPasswordMismatchError, LocalIdpSecurityPolicy
} from './local-idp.entities'


export type LocalIdpError =
  | LocalIdpAccountLockedError
  | LocalIdpAccountNotFoundError
  | LocalIdpDuplicateUsernameError
  | LocalIdpInvalidPasswordError
  | LocalIdpPasswordMismatchError

export interface MageLocalIdentityProviderService {
  readSecurityPolicy(): Promise<LocalIdpSecurityPolicy>
  saveSecurityPolicy(policy: LocalIdpSecurityPolicy): Promise<LocalIdpSecurityPolicy>
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
