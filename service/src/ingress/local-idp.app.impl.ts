import { invalidInput } from '../app.api/app.api.errors'
import { AppResponse } from '../app.api/app.api.global'
import { LocalIdpAuthenticateOperation } from './local-idp.app.api'
import { attemptAuthentication, LocalIdpRepository } from './local-idp.entities'


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