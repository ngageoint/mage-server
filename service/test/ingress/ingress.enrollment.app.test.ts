import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { expect } from 'chai'
import { omit } from 'lodash'
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
import { Role } from '../../lib/entities/authorization/entities.authorization'
import { IdentityProvider } from '../../lib/ingress/ingress.entities'
import { LocalIdpAccount } from '../../lib/local-idp/local-idp.entities'

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
    let enrollLocalUser: EnrollLocalUserByProxy

    beforeEach(function() {
      userRepo = Sub.for<UserRepository>()
      roleRepo = Sub.for<RoleRepository>()
      idpRepo = Sub.for<IdentityProviderRepository>()
      authBindingRepo = Sub.for<AuthenticationBindingRepository>()
      localIdpService = Sub.for<MageLocalIdentityProviderService>()
      permissions = Sub.for<UsersPermissionService>()
      enrollLocalUser = createEnrollLocalUserByProxyOperation(userRepo, roleRepo, idpRepo, authBindingRepo, localIdpService, permissions)
    })

    it('requires CREATE_USER permission', async function() {
      permissions.ensureCreateUserPermission(context).resolves(permissionDenied(UsersPermission.CREATE_USER, 'skinner'))
      const enrollResult = await enrollLocalUser({
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
      const enrollResult = await enrollLocalUser({
        account: { roleId: 'agent', username: 'squidward', displayName: 'Squidward', password: 'crabbypatty' },
        context
      })
      assert(enrollResult.success === null)
      expect(enrollResult.error.code).to.equal(ErrEntityNotUnique)
    })

    it('creates a local idp account and binding', async function() {
      permissions.ensureCreateUserPermission(context).resolves(null)
      const now = Date.now()
      const user: User = Object.freeze({
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
        createdAt: new Date(now),
        lastUpdated: new Date(now),
      })
      const userSeed = UserAccountSeed.prepare(user)
      userRepo.createUser(Arg.all()).resolves({ user })
      const localIdp: IdentityProvider = Object.freeze({
        id: 'local1',
        name: 'local',
        title: 'Mage Username/Password',
        protocol: AuthenticationProtocolId.Local,
        userEnrollmentPolicy: {
          accountApprovalRequired: false,
          assignRole: 'guest',
          assignToEvents: [],
          assignToTeams: [],
        }
      })
      idpRepo.findIdpByName('local').resolves(localIdp)
      const localIdpAccount: LocalIdpAccount = Object.freeze<LocalIdpAccount>({
        id: 'local:1',
        username: 'smith',
        hashedPassword: 'libertybiberty',
        previousHashedPasswords: [],
        security: {
          invalidLoginAttempts: 0,
          locked: false,
          lockedUntil: null,
          numberOfTimesLocked: 0,
        },
        createdAt: new Date(now),
        lastUpdated: new Date(now),
      })
      localIdpService.createAccount(Arg.all()).resolves(localIdpAccount)
      const savedBinding: AuthenticationBinding = Object.freeze({
        userId: 'user1',
        identities: new Map<IdentityProviderId, UserIdentity>([
          ['local1', { idpId: 'local1', idpAccountId: 'user1', created: new Date(), updated: new Date() }]
        ])
      })
      authBindingRepo.saveBindingIdentity(Arg.all()).resolves(savedBinding)
      const role: Role = Object.freeze({ id: 'guest', name: 'Guest', permissions: ['read'] })
      roleRepo.findById('guest').resolves(role)

      const enrollResult = await enrollLocalUser({
        account: { roleId: 'guest', username: 'smith', displayName: 'Agent Smith', password: 'morpheus' },
        context
      })

      assert(!enrollResult.error, 'unexpected enrollment error')
      const expectedResult: ExoUserEnrollmentResult = {
        account: user,
        authentication: {
          identityProvider: localIdp,
          local: omit(localIdpAccount, 'hashedPassword', 'previousHashedPasswords')
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
