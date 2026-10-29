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

describe.only('user account administration', function() {

  describe('creating a local user account manually', function() {

    const context: AppRequestContext = {
      locale() { return null },
      requestingPrincipal() { 'skinner' },
      requestToken: 'test'
    }
    let userRepo: SubstituteOf<UserRepository>
    let permissions: SubstituteOf<UsersPermissionService>


    beforeEach(function() {
      userRepo = Sub.for<UserRepository>()
      permissions = Sub.for<UsersPermissionService>()
    })

    it('requires CREATE_USER permission', async function() {
      permissions.ensureCreateUserPermission(context).resolves(permissionDenied(UsersPermission.CREATE_USER, 'skinner'))
      const enroll = createEnrollLocalUserByProxyOperation(userRepo, permissions)
      const enrollResult = await enroll({
        account: { roleId: 'agent', username: 'squidward', displayName: 'Squidward', password: 'crabbypattie' },
        context
      })
      assert(enrollResult.success === undefined)
      expect(enrollResult.error.code).to.equal(ErrPermissionDenied)
      permissions.received(1).ensureCreateUserPermission(context)
    })

    it('fails if the user name already exists', async function() {
      permissions.ensureCreateUserPermission(context).resolves(null)
      userRepo.createUser(Arg.all()).resolves({ error: new DuplicateUsernameError('anyone') })
      const enroll = createEnrollLocalUserByProxyOperation(userRepo, permissions)
      const enrollResult = await enroll({
        account: { roleId: 'agent', username: 'squidward', displayName: 'Squidward', password: 'crabbypattie' },
        context
      })
      assert(enrollResult.success === undefined)
      expect(enrollResult.error.code).to.equal(ErrEntityNotUnique)
    })
  })

  describe('updating a user account', function() {

  })

  describe('disabling a user account', function() {

  })
})
