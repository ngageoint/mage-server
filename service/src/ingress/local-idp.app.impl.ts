import { invalidInput } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { LocalIdpAuthenticateOperation, LocalIdpCreateAccountOperation } from './local-idp.app.api'
import { attemptAuthentication, LocalIdpDuplicateUsernameError, LocalIdpError, LocalIdpInvalidPasswordError, LocalIdpRepository, prepareNewAccount } from './local-idp.entities'


export function CreateLocalIdpAuthenticateOperation(repo: LocalIdpRepository): LocalIdpAuthenticateOperation {
  return async function localIdpAuthenticate(req): ReturnType<LocalIdpAuthenticateOperation> {
    const account = await repo.readLocalAccount(req.username)
    if (!account) {
      console.info('local account does not exist:', req.username)
      return AppResponse.error(invalidInput(`Failed to authenticate user ${req.username}`))
    }
    const securityPolicy = await repo.readSecurityPolicy()
    const attempt = await attemptAuthentication(account, req.password, securityPolicy.accountLock)
    if (attempt.failed) {
      console.info('local authentication failed', attempt.failed)
      return AppResponse.error(invalidInput(`Failed to authenticate user ${req.username}`))
    }
    const accountSaved = await repo.updateLocalAccount(attempt.authenticated)
    if (accountSaved) {
      return AppResponse.success(accountSaved)
    }
    console.error(`account for username ${req.username} did not exist for update after authentication`)
    return AppResponse.error(invalidInput(`Failed to authenticate user ${req.username}`))
  }
}

export function CreateLocalIdpCreateAccountOperation(repo: LocalIdpRepository): LocalIdpCreateAccountOperation {
  return async function localIdpCreateAccount(req) {
    const securityPolicy = await repo.readSecurityPolicy()
    const candidateAccount = await prepareNewAccount(req.username, req.password, securityPolicy)
    if (candidateAccount instanceof LocalIdpInvalidPasswordError) {
      return AppResponse.error(invalidInput(`Failed to create account ${req.username}.`, [ candidateAccount.message, 'password' ]))
    }
    const createdAccount = await repo.createLocalAccount(candidateAccount)
    if (createdAccount instanceof LocalIdpError) {
      if (createdAccount instanceof LocalIdpDuplicateUsernameError) {
        console.error(`attempted to create local account with duplicate username ${req.username}`, createdAccount)
      }
      return AppResponse.error(invalidInput(`Failed to create account ${req.username}.`))
    }
    return AppResponse.success(createdAccount)
  }
}