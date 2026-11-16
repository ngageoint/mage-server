import { expect } from 'chai'
import assert from 'node:assert'
import sinon from 'sinon'
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

describe.only('local idp authentication', function() {

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

      const password = 'just for testing'
      const lockDurationMillis = enabledPolicy.accountLock.lockDurationSeconds * 1000
      let clock: sinon.SinonFakeTimers

      beforeEach(function() {
        // only fake Date so password hashing callbacks still run on the real event loop
        clock = sinon.useFakeTimers({ now: Date.parse('2026-01-01T00:00:00Z'), toFake: [ 'Date' ] })
      })

      afterEach(function() {
        clock.restore()
      })

      async function newAccount(): Promise<LocalIdpAccount> {
        const accountSeed = await prepareNewAccount('tester', password, laxPasswords)
        assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
        return { id: 'account1', ...accountSeed }
      }

      async function failUntilLocked(account: LocalIdpAccount): Promise<LocalIdpAccount> {
        for (let attempt = 1; attempt <= enabledPolicy.accountLock.lockAfterInvalidLoginCount; attempt++) {
          const result = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
          account = result.failed.account
        }
        return account
      }

      it('locks the account after the failed authentication threshold', async function() {

        let account = await newAccount()
        const threshold = enabledPolicy.accountLock.lockAfterInvalidLoginCount
        for (let attempt = 1; attempt < threshold; attempt++) {
          const result = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
          account = result.failed.account
          expect(account.security).to.deep.equal({
            locked: false,
            lockedUntil: null,
            invalidLoginAttempts: attempt,
            numberOfTimesLocked: 0,
          })
        }

        const lockingResult = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
        assert(lockingResult.failed && lockingResult.failed.code === LocalIdpErrorCode.PasswordMismatch)
        const lockedAccount = lockingResult.failed.account
        expect(lockedAccount.security).to.deep.equal({
          locked: true,
          lockedUntil: new Date(Date.now() + lockDurationMillis),
          invalidLoginAttempts: threshold,
          numberOfTimesLocked: 1,
        })

        const correctPasswordResult = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
        assert(correctPasswordResult.failed, 'expected authentication to fail for locked account')
        expect(correctPasswordResult.failed.code).to.equal(LocalIdpErrorCode.AccountLocked)
        assert(correctPasswordResult.failed.code === LocalIdpErrorCode.AccountLocked)
        expect(correctPasswordResult.failed.account).to.deep.equal(lockedAccount)
      })

      it('authenticates and unlocks the account after the lock duration passes', async function() {

        const lockedAccount = await failUntilLocked(await newAccount())
        expect(lockedAccount.security.locked).to.be.true

        clock.tick(lockDurationMillis - 1)
        const stillLocked = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
        assert(stillLocked.failed, 'expected account to remain locked before lock duration passes')
        expect(stillLocked.failed.code).to.equal(LocalIdpErrorCode.AccountLocked)

        clock.tick(1)
        const unlocked = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
        assert(unlocked.authenticated, 'expected authentication to succeed after lock duration passes')
        expect(unlocked.authenticated).to.deep.equal({
          ...lockedAccount,
          security: {
            locked: false,
            lockedUntil: null,
            invalidLoginAttempts: 0,
            numberOfTimesLocked: 0,
          }
        })
      })

      it('resets the failed authentication count after the lock duration passes', async function() {

        const lockedAccount = await failUntilLocked(await newAccount())
        clock.tick(lockDurationMillis)

        const result = await attemptAuthentication(lockedAccount, 'wrong again', enabledPolicy.accountLock)
        assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
        expect(result.failed.account.security).to.deep.equal({
          locked: false,
          lockedUntil: null,
          invalidLoginAttempts: 1,
          numberOfTimesLocked: 1,
        })

        const relockedAccount = await failUntilLocked(lockedAccount)
        expect(relockedAccount.security).to.deep.equal({
          locked: true,
          lockedUntil: new Date(Date.now() + lockDurationMillis),
          invalidLoginAttempts: enabledPolicy.accountLock.lockAfterInvalidLoginCount,
          numberOfTimesLocked: 2,
        })
      })

      describe('locked error message', function() {

        it('includes the lock expiration time', async function() {

          const lockedAccount = await failUntilLocked(await newAccount())
          const lockedUntil = lockedAccount.security.lockedUntil
          assert(lockedUntil)

          const result = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.AccountLocked)
          expect(result.failed.message).to.equal(`account for user tester is locked until ${lockedUntil.toUTCString()}`)
        })

        it('omits the lock expiration time when the account is locked indefinitely', async function() {

          const account = await newAccount()
          const lockedAccount: LocalIdpAccount = {
            ...account,
            security: { ...account.security, locked: true, lockedUntil: null, numberOfTimesLocked: enabledPolicy.accountLock.disableAfterLockCount }
          }

          const result = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.AccountLocked)
          expect(result.failed.message).to.equal('account for user tester is locked')
        })
      })
    })
  })
})
