import assert from 'node:assert'
import { entityNotUnique, EntityNotUniqueError, invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { AppResponse, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import * as api from '../../app.api/users/app.api.users'
import { PageOf } from '../../entities/entities.global'
import { DuplicateUsernameError, UserAccountSeed, UserRepository } from '../../entities/users/entities.users'
import { AuthenticationBindingRepository, IdentityProviderRepository, UserIdentity } from '../../ingress/ingress.entities'
import { LocalIdpErrorCode } from '../../local-idp/local-idp.entities'
import { LocalIdpError, MageLocalIdentityProviderService } from '../../local-idp/local-idp.services.api'

function appErrorForLocalIdpError(err: LocalIdpError): EntityNotUniqueError | InvalidInputError {
  if (err.code === LocalIdpErrorCode.DuplicateUserName) {
    return entityNotUnique('User', 'A user with that username already exists')
  }
  if (err.code === LocalIdpErrorCode.InvalidPassword) {
    return invalidInput('Invalid password', [err.message, 'password'])
  }
  console.error('unknown error', err)
  assert.fail('unknown error')
}

export function createEnrollLocalUserByProxyOperation(userRepo: UserRepository, idpRepo: IdentityProviderRepository, authBindingRepo: AuthenticationBindingRepository, localIdpService: MageLocalIdentityProviderService, permissions: api.UsersPermissionService): api.EnrollLocalUserByProxy {
  return async function enrollLocalUserByProxy(req: api.EnrollLocalUserByProxyRequest): ReturnType<api.EnrollLocalUserByProxy> {
    const denied = await permissions.ensureCreateUserPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const { account } = req
    const localIdp = await idpRepo.findIdpByName('local')
    assert(localIdp, 'local identity provider not found')
    const localIdpAccount = await localIdpService.createAccount(account)
    if (localIdpAccount instanceof Error) {
      return AppResponse.error(appErrorForLocalIdpError(localIdpAccount))
    }
    const seed = UserAccountSeed.prepare({
      username: localIdpAccount.username,
      displayName: account.displayName,
      email: account.email,
      phones: account.phone ? [{ type: 'Main', number: account.phone }] : [],
      active: true,
      enabled: true,
      icon: null,
      avatar: null,
      roleId: account.roleId,
      authenticationId: 'todo',
    })
    const created = await userRepo.createUser(seed)
    if (created.error) {
      if (created.error instanceof DuplicateUsernameError) {
        return AppResponse.error(entityNotUnique('User', 'username already exists', { username: created.error.username }))
      }
      // TODO: better error handling
      throw created.error
    }
    const mageAccount = created.user
    const now = Date.now()
    const localBinding: UserIdentity = {
      idpId: localIdp.id,
      idpAccountId: mageAccount.username,
      created: new Date(now),
      updated: new Date(now)
    }
    const bindings = await authBindingRepo.saveBindingIdentity(mageAccount.id, localBinding)
    throw 'todo'
  }
}

export function createSearchUsersOperation(userRepo: UserRepository, permissions: api.UsersPermissionService): api.SearchUsers {
  return async function searchUsers(req: api.UserSearchRequest): ReturnType<api.SearchUsers> {
    return await withPermission<PageOf<api.UserSearchResult>,KnownErrorsOf<api.SearchUsers>>(
      permissions.ensureReadUsersPermission(req.context),
      async (): Promise<PageOf<api.UserSearchResult>> => {
        return await userRepo.find<api.UserSearchResult>(req.userSearch, x => api.searchResultFor(x));
      }
    )
  }
}
