import { expect } from 'chai'
import assert from 'node:assert'
import { AccountLockPolicy, attemptAuthentication, LocalIdpAccount } from '../../lib/local-idp/local-idp.entities'
import { LocalIdpErrorCode } from '../../lib/local-idp/local-idp.entities'
import { LocalIdpAccountSeed, prepareNewAccount } from '../../lib/local-idp/local-idp.entities'
import { defaultLocalIdpSecurityPolicy } from '../../lib/local-idp/local-idp.entities'
import { PasswordRequirements } from '../../lib/local-idp/password-requirements'
import { LocalIdpSecurityPolicy } from '../../lib/local-idp/local-idp.entities'

const laxPasswords: PasswordRequirements = Object.freeze({})
const accountLock: AccountLockPolicy = Object.freeze({
  enabled: false,
  lockAfterInvalidLoginCount: 3,
  lockDurationSeconds: 60,
  disableAfterLockCount: 3,
})
const policy: LocalIdpSecurityPolicy = Object.freeze({
  passwordRequirements: laxPasswords,
  accountLock: accountLock
})

describe('local idp authentication', function() {

  it('passes with a matching password', async function() {

    const accountSeed = await prepareNewAccount('tester', `th@t's r!ght`, laxPasswords)
    assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
    const account = { ...accountSeed, id: 'account1' }
    const auth = await attemptAuthentication(account, `th@t's r!ght`, defaultLocalIdpSecurityPolicy.accountLock)
    assert(auth.authenticated, 'expected authentication to succeed')
    expect(auth.authenticated).to.deep.equal(account)
  })

  it('fails with a mismatched password', async function() {

    const accountSeed = await prepareNewAccount('tester', '@lmost', laxPasswords)
    assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
    const account = { ...accountSeed, id: 'account1' }
    const auth = await attemptAuthentication(account, 'almost', defaultLocalIdpSecurityPolicy.accountLock)
    assert(auth.failed, 'expected authentication to fail')
    expect(auth.failed.code).to.equal(LocalIdpErrorCode.PasswordMismatch)
  })

  describe('account lock policy', function() {

    describe('validation', function() {

      it('accepts only positive integers for account lock policy', function() {
        expect.fail('todo')
      })
    })

    describe('enabled', function() {

      const enabledPolicy: LocalIdpSecurityPolicy = Object.freeze({
        passwordRequirements: policy.passwordRequirements,
        accountLock: Object.freeze({
          ...policy.accountLock,
          enabled: true
        })
      })

      it('increments failed authentication count', async function() {

        const accountSeed = await prepareNewAccount('tester', 'just for testing', laxPasswords)
        assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
        const account: LocalIdpAccount = { id: 'account1', ...accountSeed }

        const result1 = await attemptAuthentication(account, 'whoops', enabledPolicy.accountLock)
        assert(!result1.authenticated)
        assert(result1.failed.code === LocalIdpErrorCode.PasswordMismatch)
        const account1 = result1.failed.account
        expect(account1.security.invalidLoginAttempts).to.equal(1)

        const result2 = await attemptAuthentication(account1, 'typo', enabledPolicy.accountLock)
        assert(!result2.authenticated)
        assert(result2.failed.code === LocalIdpErrorCode.PasswordMismatch)
        const account2 = result2.failed.account
        expect(account2.security.invalidLoginAttempts).to.equal(2)
      })

      it('locks the account after the failed authentication threshold', async function() {
        expect.fail('todo')
      })

      it('authenticates and unlocks the account after the lock duration passes', async function() {
        expect.fail('todo')
      })
    })
  })
})
