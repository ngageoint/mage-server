import {
  attemptAuthentication, LocalIdpAccount, LocalIdpAuthenticationResult, LocalIdpCredentials,
  LocalIdpErrorCode, LocalIdpRepository, prepareNewAccount
} from './local-idp.entities'
import { LocalIdpError, MageLocalIdentityProviderService } from './local-idp.services.api'

/*
TODO: Maybe it's fine to bake all the Mongoose repository code into this module as local-idp is a
pretty small unit.
 */
export function createLocalIdentityProviderService(repo: LocalIdpRepository): MageLocalIdentityProviderService {

  async function createAccount(credentials: LocalIdpCredentials): Promise<LocalIdpAccount | LocalIdpError> {
    const securityPolicy = await repo.readSecurityPolicy()
    const { username, password } = credentials
    const candidateAccount = await prepareNewAccount(username, password, securityPolicy)
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
    readSecurityPolicy: () => repo.readSecurityPolicy(),
    saveSecurityPolicy: policy => repo.saveSecurityPolicy(policy),
    createAccount,
    deleteAccount,
    authenticate,
  }
}
