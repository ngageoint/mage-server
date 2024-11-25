import { LocalIdpAccount, LocalIdpAuthenticationResult, LocalIdpCredentials, LocalIdpError } from './local-idp.entities'


export interface MageLocalIdentityProviderService {
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