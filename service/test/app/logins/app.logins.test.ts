import { describe, it } from 'mocha'
import { expect } from 'chai'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { ErrPermissionDenied, permissionDenied } from '../../../lib/app.api/app.api.errors'
import * as api from '../../../lib/app.api/logins/app.api.logins'
import * as impl from '../../../lib/app.impl/logins/app.impl.logins'
import { UsersPermissionService } from '../../../lib/app.api/users/app.api.users'
import { LoginRepository } from '../../../lib/entities/logins/entities.logins'
import { UserWithRole } from '../../../lib/permissions/permissions.role-based.base'

const principal = { id: 'user1', username: 'testuser' } as unknown as UserWithRole

function createContext(): api.LoginRequestContext {
  return {
    requestToken: Symbol(),
    requestingPrincipal: () => principal,
    locale: () => null,
  }
}

describe('logins app layer', function() {

  let permissionService: SubstituteOf<UsersPermissionService>
  let repo: SubstituteOf<LoginRepository>
  let readLogins: api.ReadLogins

  beforeEach(function() {
    permissionService = Sub.for<UsersPermissionService>()
    repo = Sub.for<LoginRepository>()
    readLogins = impl.ReadLogins(permissionService, repo)
  })

  describe('ReadLogins', function() {
    it('returns permission denied without querying the repo', async function() {
      const req: api.ReadLoginsRequest = { context: createContext(), filter: {}, limit: 10 }
      permissionService.ensureReadUsersPermission(Arg.all()).resolves(permissionDenied('READ_USER', principal.id))
      const res = await readLogins(req)

      expect(res.success).to.be.null
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      repo.didNotReceive().findMany(Arg.all())
    })

    it('returns the logins from the repo on success', async function() {
      const logins = [{ id: 'login1' }]
      const req: api.ReadLoginsRequest = { context: createContext(), filter: { userId: 'user1' }, limit: 10, lastLoginId: null, firstLoginId: null }
      permissionService.ensureReadUsersPermission(Arg.all()).resolves(null)
      repo.findMany(Arg.any(), Arg.any()).resolves(logins as any)
      const res = await readLogins(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(logins)
      repo.received().findMany(req.filter, { limit: 10, lastLoginId: null, firstLoginId: null })
    })
  })
})
