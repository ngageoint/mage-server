import assert from 'node:assert'
import {
  entityNotFound,
  entityNotUnique,
  EntityNotUniqueError,
  infrastructureError,
  invalidInput,
  InvalidInputError
} from '../../app.api/app.api.errors'
import { AppResponse, KnownErrorsOf, withPermission } from '../../app.api/app.api.global'
import * as api from '../../app.api/users/app.api.users'
import { RoleRepository } from '../../entities/authorization/entities.authorization'
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

export function createEnrollLocalUserByProxyOperation(
  userRepo: UserRepository,
  roleRepo: RoleRepository,
  idpRepo: IdentityProviderRepository,
  authBindingRepo: AuthenticationBindingRepository,
  localIdpService: MageLocalIdentityProviderService,
  permissions: api.UsersPermissionService): api.EnrollLocalUserByProxy {
  return async function enrollLocalUserByProxy(req: api.EnrollLocalUserByProxyRequest): ReturnType<api.EnrollLocalUserByProxy> {
    const denied = await permissions.ensureCreateUserPermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const { account } = req
    const role = await roleRepo.findById(account.roleId)
    if (!role) {
      return AppResponse.error(entityNotFound(account.roleId, 'Role'))
    }
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
      // admin-created accounts are always immediately active
      active: true,
      enabled: true,
      icon: null,
      avatar: null,
      roleId: role.id,
      authenticationId: null,
    })
    const created = await userRepo.createUser(seed)
    // TODO: apply enrollment policy for default role, team, event membership
    if (created.error) {
      if (created.error instanceof DuplicateUsernameError) {
        return AppResponse.error(entityNotUnique('User', 'username already exists', { username: created.error.username }))
      }
      // TODO: better error handling
      throw created.error
    }
    const mageAccount = created.user
    const now = Date.now()
    const localAuthBinding: UserIdentity = {
      idpId: localIdp.id,
      idpAccountId: mageAccount.username,
      created: new Date(now),
      updated: new Date(now)
    }
    const binding = await authBindingRepo.saveBindingIdentity(mageAccount.id, localAuthBinding)
    if (binding instanceof Error) {
      const message = 'error creating local identity binding for user ' + account.username
      console.error('error creating local identity binding for user ' + account.username, binding)
      return AppResponse.error(infrastructureError(message))
    }
    // TODO: user.authenticationId remains null here. will the web app care?
    return AppResponse.success({
      user: mageAccount,
      authentication: {
        identityProvider: localIdp,
        local: localIdpAccount
      },
      authorization: { role }
    })
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
