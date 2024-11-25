import { attemptAuthentication, LocalIdpAccount, LocalIdpAuthenticationResult, LocalIdpCredentials, LocalIdpDuplicateUsernameError, LocalIdpError, LocalIdpInvalidPasswordError, LocalIdpRepository, prepareNewAccount } from './local-idp.entities'
import { MageLocalIdentityProviderService } from './local-idp.services.api'


export function createLocalIdentityProviderService(repo: LocalIdpRepository): MageLocalIdentityProviderService {

  async function createAccount(credentials: LocalIdpCredentials): Promise<LocalIdpAccount | LocalIdpError> {
    const securityPolicy = await repo.readSecurityPolicy()
    const { username, password } = credentials
    const candidateAccount = await prepareNewAccount(username, password, securityPolicy)
    if (candidateAccount instanceof LocalIdpInvalidPasswordError) {
      return candidateAccount
    }
    const createdAccount = await repo.createLocalAccount(candidateAccount)
    if (createdAccount instanceof LocalIdpError) {
      if (createdAccount instanceof LocalIdpDuplicateUsernameError) {
        console.error(`attempted to create local account with duplicate username ${username}`, createdAccount)
      }
      return createdAccount
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
    const securityPolicy = await repo.readSecurityPolicy()
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

  return {
    createAccount,
    deleteAccount,
    authenticate,
  }
}
