import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import assert from 'node:assert'
import { ErrPermissionDenied } from '../../lib/app.api/app.api.errors'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { UsersPermissionService } from '../../lib/app.api/users/app.api.users'
import { UserRepository } from '../../lib/entities/users/entities.users'
import { permissionDenied } from '../../lib/app.api/app.api.errors'
import { UsersPermission } from '../../lib/entities/authorization/entities.permissions'
import { ErrEntityNotUnique } from '../../lib/app.api/app.api.errors'
import { DuplicateUsernameError } from '../../lib/entities/users/entities.users'
import { User } from '../../lib/entities/users/entities.users'
import { AuthenticationBindingRepository, IdentityProviderRepository } from '../../lib/ingress/ingress.entities'
import { MageLocalIdentityProviderService } from '../../lib/local-idp/local-idp.services.api'
import { AuthenticationBinding, IdentityProviderId, UserIdentity } from '../../lib/ingress/ingress.entities'
import { UserAccountSeed } from '../../lib/entities/users/entities.users'
import { RoleRepository } from '../../lib/entities/authorization/entities.authorization'
import { AuthenticationProtocolId } from '../../lib/ingress/ingress.entities'
import { EnrollLocalUserByProxy, ExoUserEnrollmentResult } from '../../lib/ingress/ingress.enrollment.app.api'
import { createEnrollLocalUserByProxyOperation } from '../../lib/ingress/ingress.enrollment.app.impl'

describe.only('user account administration', function() {

  describe('enrolling a new local user account by proxy', function() {

    const context: AppRequestContext = {
      locale() { return null },
      requestingPrincipal() { 'skinner' },
      requestToken: 'test'
    }
    let userRepo: SubstituteOf<UserRepository>
    let roleRepo: SubstituteOf<RoleRepository>
    let idpRepo: SubstituteOf<IdentityProviderRepository>
    let authBindingRepo: SubstituteOf<AuthenticationBindingRepository>
    let localIdpService: SubstituteOf<MageLocalIdentityProviderService>
    let permissions: SubstituteOf<UsersPermissionService>
    let enroll: EnrollLocalUserByProxy

    beforeEach(function() {
      userRepo = Sub.for<UserRepository>()
      roleRepo = Sub.for<RoleRepository>()
      idpRepo = Sub.for<IdentityProviderRepository>()
      authBindingRepo = Sub.for<AuthenticationBindingRepository>()
      localIdpService = Sub.for<MageLocalIdentityProviderService>()
      permissions = Sub.for<UsersPermissionService>()
      enroll = createEnrollLocalUserByProxyOperation(userRepo, roleRepo, idpRepo, authBindingRepo, localIdpService, permissions)
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
      permissions.ensureCreateUserPermission(context).resolves(null)
      const user: User = {
        id: 'user1',
        username: 'smith',
        displayName: 'Agent Smith',
        phones: [],
        enabled: true,
        active: true,
        avatar: null,
        icon: null,
        roleId: 'guest',
        authenticationId: null,
        createdAt: new Date(),
        lastUpdated: new Date(),
      }
      const userSeed = UserAccountSeed.prepare(user)
      userRepo.createUser(Arg.all()).resolves({ user })
      const savedBinding: AuthenticationBinding = {
        userId: 'user1',
        identities: new Map<IdentityProviderId, UserIdentity>([
          ['local1', { idpId: 'local1', idpAccountId: 'user1', created: new Date(), updated: new Date() }]
        ])
      }
      authBindingRepo.saveBindingIdentity(Arg.all()).resolves(savedBinding)
      const enrollResult = await enroll({
        account: { roleId: 'agent', username: 'smith', displayName: 'Agent Smith', password: 'morpheus' },
        context
      })
      assert(!enrollResult.error, 'unexpected enrollment error')
      const expectedResult: ExoUserEnrollmentResult = {
        account: user,
        authentication: {
          identityProvider: {
            id: 'local',
            name: 'local',
            title: 'Mage Username/Password',
            protocol: AuthenticationProtocolId.Local,
            userEnrollmentPolicy: {
              accountApprovalRequired: false,
              assignRole: 'guest',
              assignToEvents: [],
              assignToTeams: [],
            }
          }
        },
        authorization: {
          role: {
            id: 'guest',
            name: 'Guest',
            permissions: ['read']
          }
        }
      }
      expect(enrollResult.success).to.deep.equal(expectedResult)
      userRepo.received(1).createUser(Arg.is(actual => {
        expect(actual.toJSON()).to.deep.equal(userSeed.toJSON())
        return true
      }))
      expect.fail('todo')
    })

    it('does not create a mage account if creating a local idp account fails', async function() {
      expect.fail('todo')
    })

    it('adds the user to the configured teams', async function() {
      expect.fail('todo')
    })

    it('adds the user to the configured events', async function() {
      expect.fail('todo')
    })
  })

  describe('updating a user account', function() {

  })

  describe('disabling a user account', function() {

  })
})
