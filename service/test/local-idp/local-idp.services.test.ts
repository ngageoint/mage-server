import { expect } from 'chai'
import assert from 'node:assert'
import sinon from 'sinon'
import { defaultLocalIdpSecurityPolicy, LocalIdpErrorCode, LocalIdpRepository, LocalIdpSecurityPolicy, ValidAccountLockPolicy } from '../../lib/local-idp/local-idp.entities'
import { createLocalIdentityProviderService } from '../../lib/local-idp/local-idp.services.impl'

describe('local idp service', function() {

  describe('saving the security policy', function() {

    const validPolicy: LocalIdpSecurityPolicy = Object.freeze({
      passwordRequirements: Object.freeze({}),
      accountLock: Object.freeze({
        enabled: true,
        lockAfterInvalidLoginCount: 3,
        lockDurationSeconds: 60,
        disableAfterLockCount: 3,
      })
    })

    let repo: sinon.SinonStubbedInstance<LocalIdpRepository>

    beforeEach(function() {
      repo = {
        readSecurityPolicy: sinon.stub(),
        saveSecurityPolicy: sinon.stub(),
        createLocalAccount: sinon.stub(),
        readLocalAccount: sinon.stub(),
        updateLocalAccount: sinon.stub(),
        deleteLocalAccount: sinon.stub(),
      }
    })

    it('reads the default policy without saving it when no policy exists', async function() {

      repo.readSecurityPolicy.resolves(null)
      const service = createLocalIdentityProviderService(repo)
      const read = await service.readSecurityPolicy()
      expect(read).to.equal(defaultLocalIdpSecurityPolicy)
      expect(repo.saveSecurityPolicy.called).to.be.false
    })

    it('saves a valid policy', async function() {

      repo.saveSecurityPolicy.resolves(validPolicy)
      const service = createLocalIdentityProviderService(repo)
      const saved = await service.saveSecurityPolicy(validPolicy)
      expect(saved).to.equal(validPolicy)
      expect(repo.saveSecurityPolicy.calledOnce).to.be.true
      const savedArg = repo.saveSecurityPolicy.firstCall.args[0]
      expect(savedArg.passwordRequirements).to.equal(validPolicy.passwordRequirements)
      expect(savedArg.accountLock).to.be.instanceOf(ValidAccountLockPolicy)
      expect({ ...savedArg.accountLock }).to.deep.equal(validPolicy.accountLock)
    })

    it('returns an error without saving an invalid account lock policy', async function() {

      const invalidPolicy: LocalIdpSecurityPolicy = {
        ...validPolicy,
        accountLock: { ...validPolicy.accountLock, lockDurationSeconds: 0 }
      }
      const service = createLocalIdentityProviderService(repo)
      const result = await service.saveSecurityPolicy(invalidPolicy)
      assert(result instanceof Error, 'expected an error')
      assert(result.code === LocalIdpErrorCode.InvalidAccountLockPolicy)
      expect(result.invalidKeys).to.deep.equal([ 'lockDurationSeconds' ])
      expect(repo.saveSecurityPolicy.called).to.be.false
    })
  })
})
