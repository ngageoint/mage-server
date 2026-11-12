import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import assert from 'node:assert'
import { ErrPermissionDenied } from '../../../lib/app.api/app.api.errors'
import { AppRequestContext } from '../../../lib/app.api/app.api.global'
import { UsersPermissionService } from '../../../lib/app.api/users/app.api.users'
import { createEnrollLocalUserByProxyOperation } from '../../../lib/app.impl/users/app.impl.users'
import { UserRepository } from '../../../lib/entities/users/entities.users'
import { permissionDenied } from '../../../lib/app.api/app.api.errors'
import { UsersPermission } from '../../../lib/entities/authorization/entities.permissions'
import { ErrEntityNotUnique } from '../../../lib/app.api/app.api.errors'
import { DuplicateUsernameError } from '../../../lib/entities/users/entities.users'
import { EnrollLocalUserByProxy } from '../../../src/app.api/users/app.api.users'
import { AuthenticationBindingRepository, IdentityProviderRepository } from '../../../src/ingress/ingress.entities'
import { MageLocalIdentityProviderService } from '../../../src/local-idp/local-idp.services.api'

describe('user account administration', function() {

  describe('enrolling a new local user account by proxy', function() {

    const context: AppRequestContext = {
      locale() { return null },
      requestingPrincipal() { 'skinner' },
      requestToken: 'test'
    }
    let userRepo: SubstituteOf<UserRepository>
    let idpRepo: SubstituteOf<IdentityProviderRepository>
    let authBindingRepo: SubstituteOf<AuthenticationBindingRepository>
    let localIdp: SubstituteOf<MageLocalIdentityProviderService>
    let permissions: SubstituteOf<UsersPermissionService>
    let enroll: EnrollLocalUserByProxy

    beforeEach(function() {
      userRepo = Sub.for<UserRepository>()
      idpRepo = Sub.for<IdentityProviderRepository>()
      authBindingRepo = Sub.for<AuthenticationBindingRepository>()
      localIdp = Sub.for<MageLocalIdentityProviderService>()
      permissions = Sub.for<UsersPermissionService>()
      enroll = createEnrollLocalUserByProxyOperation(userRepo, idpRepo, authBindingRepo, localIdp, permissions)
    })

    it('requires CREATE_USER permission', async function() {
      permissions.ensureCreateUserPermission(context).resolves(permissionDenied(UsersPermission.CREATE_USER, 'skinner'))
      const enrollResult = await enroll({
        account: { roleId: 'agent', username: 'squidward', displayName: 'Squidward', password: 'crabbypatty' },
        context
      })
      assert(enrollResult.success === null)
      expect(enrollResult.error.code).to.equal(ErrPermissionDenied)
      permissions.received(1).ensureCreateUserPermission(context)
    })

    it('fails if the user name already exists', async function() {
      permissions.ensureCreateUserPermission(context).resolves(null)
      userRepo.createUser(Arg.all()).resolves({ error: new DuplicateUsernameError('anyone') })
      const enrollResult = await enroll({
        account: { roleId: 'agent', username: 'squidward', displayName: 'Squidward', password: 'crabbypatty' },
        context
      })
      assert(enrollResult.success === null)
      expect(enrollResult.error.code).to.equal(ErrEntityNotUnique)
    })

    it('creates a local idp account and binding', async function() {
      expect.fail('todo')
    })
  })

  describe('updating a user account', function() {

  })

  describe('disabling a user account', function() {

  })
})
