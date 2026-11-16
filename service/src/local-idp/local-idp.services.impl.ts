import {
  attemptAuthentication, defaultLocalIdpSecurityPolicy, LocalIdpAccount, LocalIdpAuthenticationResult, LocalIdpCredentials,
  LocalIdpErrorCode, LocalIdpInvalidAccountLockPolicyError, LocalIdpRepository, LocalIdpSecurityPolicy, prepareNewAccount,
  validateAccountLockPolicy
} from './local-idp.entities'
import { LocalIdpError, MageLocalIdentityProviderService } from './local-idp.services.api'

/*
TODO: Maybe it's fine to bake all the Mongoose repository code into this module as local-idp is a
pretty small unit.
 */
export function createLocalIdentityProviderService(repo: LocalIdpRepository): MageLocalIdentityProviderService {

  /**
   * Return the default policy without saving it if no policy exists.
   */
  async function readSecurityPolicy(): Promise<LocalIdpSecurityPolicy> {
    return await repo.readSecurityPolicy() || defaultLocalIdpSecurityPolicy
  }

  async function createAccount(credentials: LocalIdpCredentials): Promise<LocalIdpAccount | LocalIdpError> {
    const securityPolicy = await readSecurityPolicy()
    const { username, password } = credentials
    const candidateAccount = await prepareNewAccount(username, password, securityPolicy.passwordRequirements)
    if (candidateAccount instanceof Error) {
      return candidateAccount
    }
    const createdAccount = await repo.createLocalAccount(candidateAccount)
    if (createdAccount instanceof Error) {
      if (createdAccount.code === LocalIdpErrorCode.DuplicateUserName) {
        console.error(`attempted to create local account with duplicate username ${username}`, createdAccount)
      }
    }
    return createdAccount
  }

  function deleteAccount(username: string): Promise<LocalIdpAccount | null> {
    return repo.deleteLocalAccount(username)
  }

  async function authenticate(credentials: LocalIdpCredentials): Promise<LocalIdpAuthenticationResult | null> {
    const { username, password } = credentials
    const account = await repo.readLocalAccount(username)
    if (!account) {
      console.info('local account does not exist:', username)
      return null
    }
    const securityPolicy = await readSecurityPolicy()
    const attempt = await attemptAuthentication(account, password, securityPolicy.accountLock)
    if (attempt.failed) {
      console.info('local authentication failed', attempt.failed)
      return attempt
    }
    const accountSaved = await repo.updateLocalAccount(attempt.authenticated)
    if (accountSaved) {
      attempt.authenticated = accountSaved
      return attempt
    }
    console.error(`account for username ${username} did not exist for update after authentication attempt`)
    return null
  }

  async function saveSecurityPolicy(policy: LocalIdpSecurityPolicy): Promise<LocalIdpSecurityPolicy | LocalIdpInvalidAccountLockPolicyError> {
    const accountLock = validateAccountLockPolicy(policy.accountLock)
    if (accountLock instanceof Error) {
      return accountLock
    }
    return await repo.saveSecurityPolicy({ ...policy, accountLock })
  }

  return {
    readSecurityPolicy,
    saveSecurityPolicy,
    createAccount,
    deleteAccount,
    authenticate,
  }
}
