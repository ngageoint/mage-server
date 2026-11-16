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

    describe('disabled', function() {

      it('does not track failed authentication attempts or lock the account', async function() {

        const password = 'just for testing'
        const accountSeed = await prepareNewAccount('tester', password, laxPasswords)
        assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
        const account: LocalIdpAccount = { id: 'account1', ...accountSeed }
        expect(policy.accountLock.enabled).to.be.false

        let current = account
        for (let attempt = 1; attempt <= policy.accountLock.lockAfterInvalidLoginCount * 2; attempt++) {
          const result = await attemptAuthentication(current, 'wrong', policy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
          expect(result.failed.account).to.deep.equal(account)
          current = result.failed.account
        }

        const result = await attemptAuthentication(current, password, policy.accountLock)
        assert(result.authenticated, 'expected authentication to succeed')
        expect(result.authenticated).to.deep.equal(account)
      })

      describe('with an account locked while the policy was enabled', function() {

        const password = 'just for testing'
        const unlockedStatus = Object.freeze({
          locked: false,
          lockedUntil: null,
          invalidLoginAttempts: 0,
          numberOfTimesLocked: 0,
        })
        const lockStatuses = {
          'until a future time': {
            locked: true,
            lockedUntil: new Date(Date.now() + 60 * 60 * 1000),
            invalidLoginAttempts: policy.accountLock.lockAfterInvalidLoginCount,
            numberOfTimesLocked: 1,
          },
          'indefinitely': {
            locked: true,
            lockedUntil: null,
            invalidLoginAttempts: policy.accountLock.lockAfterInvalidLoginCount,
            numberOfTimesLocked: policy.accountLock.disableAfterLockCount,
          },
        }

        async function lockedAccount(security: LocalIdpAccount['security']): Promise<LocalIdpAccount> {
          const accountSeed = await prepareNewAccount('tester', password, laxPasswords)
          assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
          return { id: 'account1', ...accountSeed, security: { ...security } }
        }

        for (const [ lockDescription, lockStatus ] of Object.entries(lockStatuses)) {

          describe(`locked ${lockDescription}`, function() {

            it('authenticates and resets the account security status', async function() {

              const account = await lockedAccount(lockStatus)
              const result = await attemptAuthentication(account, password, policy.accountLock)
              assert(result.authenticated, 'expected authentication to succeed')
              expect(result.authenticated).to.deep.equal({ ...account, security: unlockedStatus })
            })

            it('fails a mismatched password and resets the account security status', async function() {

              const account = await lockedAccount(lockStatus)
              const result = await attemptAuthentication(account, 'wrong', policy.accountLock)
              assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
              expect(result.failed.account).to.deep.equal({ ...account, security: unlockedStatus })
            })
          })
        }
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

      describe('mismatched password while locked', function() {

        it('fails as locked without changing the account security status', async function() {

          const lockedAccount = await failUntilLocked(await newAccount())
          clock.tick(lockDurationMillis - 1)

          let account = lockedAccount
          for (let attempt = 1; attempt <= enabledPolicy.accountLock.lockAfterInvalidLoginCount * 2; attempt++) {
            const result = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
            assert(result.failed && result.failed.code === LocalIdpErrorCode.AccountLocked)
            expect(result.failed.account).to.deep.equal(lockedAccount)
            account = result.failed.account
          }
        })

        it('fails indistinguishably from the correct password', async function() {

          const lockedAccount = await failUntilLocked(await newAccount())

          const correctResult = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
          const wrongResult = await attemptAuthentication(lockedAccount, 'wrong', enabledPolicy.accountLock)
          assert(correctResult.failed && correctResult.failed.code === LocalIdpErrorCode.AccountLocked)
          assert(wrongResult.failed && wrongResult.failed.code === LocalIdpErrorCode.AccountLocked)
          expect(wrongResult.failed.message).to.equal(correctResult.failed.message)
          expect(wrongResult.failed.account).to.deep.equal(correctResult.failed.account)
        })
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

      describe('successful authentication', function() {

        it('resets the failed authentication count before reaching the lock threshold', async function() {

          let account = await newAccount()
          const threshold = enabledPolicy.accountLock.lockAfterInvalidLoginCount
          for (let attempt = 1; attempt < threshold; attempt++) {
            const result = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
            assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
            account = result.failed.account
          }
          expect(account.security.invalidLoginAttempts).to.equal(threshold - 1)

          const authResult = await attemptAuthentication(account, password, enabledPolicy.accountLock)
          assert(authResult.authenticated, 'expected authentication to succeed')
          account = authResult.authenticated
          expect(account.security).to.deep.equal({
            locked: false,
            lockedUntil: null,
            invalidLoginAttempts: 0,
            numberOfTimesLocked: 0,
          })

          // a full set of failures below the threshold must not lock the account
          for (let attempt = 1; attempt < threshold; attempt++) {
            const result = await attemptAuthentication(account, 'wrong', enabledPolicy.accountLock)
            assert(result.failed && result.failed.code === LocalIdpErrorCode.PasswordMismatch)
            account = result.failed.account
          }
          expect(account.security).to.deep.equal({
            locked: false,
            lockedUntil: null,
            invalidLoginAttempts: threshold - 1,
            numberOfTimesLocked: 0,
          })
        })

        it('resets the lock count', async function() {

          const lockedAccount = await failUntilLocked(await newAccount())
          expect(lockedAccount.security.numberOfTimesLocked).to.equal(1)
          clock.tick(lockDurationMillis)

          const result = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
          assert(result.authenticated, 'expected authentication to succeed after lock duration passes')
          expect(result.authenticated.security.numberOfTimesLocked).to.equal(0)
        })

        it('prevents indefinite lock when interleaved between timed locks', async function() {

          const disableAfterLockCount = enabledPolicy.accountLock.disableAfterLockCount
          let account = await newAccount()
          for (let lockCount = 1; lockCount < disableAfterLockCount; lockCount++) {
            account = await failUntilLocked(account)
            clock.tick(lockDurationMillis)
          }
          expect(account.security.numberOfTimesLocked).to.equal(disableAfterLockCount - 1)

          const authResult = await attemptAuthentication(account, password, enabledPolicy.accountLock)
          assert(authResult.authenticated, 'expected authentication to succeed after lock duration passes')
          account = authResult.authenticated

          account = await failUntilLocked(account)
          expect(account.security).to.deep.equal({
            locked: true,
            lockedUntil: new Date(Date.now() + lockDurationMillis),
            invalidLoginAttempts: enabledPolicy.accountLock.lockAfterInvalidLoginCount,
            numberOfTimesLocked: 1,
          })
        })
      })

      describe('indefinite lock', function() {

        async function lockIndefinitely(): Promise<LocalIdpAccount> {
          let account = await newAccount()
          for (let lockCount = 1; lockCount < enabledPolicy.accountLock.disableAfterLockCount; lockCount++) {
            account = await failUntilLocked(account)
            clock.tick(lockDurationMillis)
          }
          return await failUntilLocked(account)
        }

        it('locks the account indefinitely after the lock count threshold', async function() {

          let account = await newAccount()
          const disableAfterLockCount = enabledPolicy.accountLock.disableAfterLockCount
          for (let lockCount = 1; lockCount < disableAfterLockCount; lockCount++) {
            account = await failUntilLocked(account)
            expect(account.security).to.deep.equal({
              locked: true,
              lockedUntil: new Date(Date.now() + lockDurationMillis),
              invalidLoginAttempts: enabledPolicy.accountLock.lockAfterInvalidLoginCount,
              numberOfTimesLocked: lockCount,
            })
            clock.tick(lockDurationMillis)
          }

          account = await failUntilLocked(account)
          expect(account.security).to.deep.equal({
            locked: true,
            lockedUntil: null,
            invalidLoginAttempts: enabledPolicy.accountLock.lockAfterInvalidLoginCount,
            numberOfTimesLocked: disableAfterLockCount,
          })
        })

        it('rejects the correct password regardless of elapsed time', async function() {

          const lockedAccount = await lockIndefinitely()
          expect(lockedAccount.security).to.include({ locked: true, lockedUntil: null })

          clock.tick(lockDurationMillis * 1000)
          const result = await attemptAuthentication(lockedAccount, password, enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.AccountLocked)
          expect(result.failed.account).to.deep.equal(lockedAccount)
        })

        it('does not change the account security status for a mismatched password', async function() {

          const lockedAccount = await lockIndefinitely()

          clock.tick(lockDurationMillis * 1000)
          const result = await attemptAuthentication(lockedAccount, 'wrong', enabledPolicy.accountLock)
          assert(result.failed && result.failed.code === LocalIdpErrorCode.AccountLocked)
          expect(result.failed.account).to.deep.equal(lockedAccount)
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

  describe('input account', function() {

    const password = 'just for testing'
    const now = Date.parse('2026-01-01T00:00:00Z')
    const enabledLock: AccountLockPolicy = Object.freeze({ ...policy.accountLock, enabled: true })
    const disabledLock = policy.accountLock
    const threshold = enabledLock.lockAfterInvalidLoginCount
    let clock: sinon.SinonFakeTimers
    let seed: LocalIdpAccountSeed

    before(async function() {
      const accountSeed = await prepareNewAccount('tester', password, laxPasswords)
      assert(accountSeed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
      seed = accountSeed
    })

    beforeEach(function() {
      clock = sinon.useFakeTimers({ now, toFake: [ 'Date' ] })
    })

    afterEach(function() {
      clock.restore()
    })

    /**
     * Recursively freeze the given object, so any attempt to modify it throws a `TypeError` in strict mode.  Freezing
     * does not protect a `Date`'s internal time value, so tests also compare the account to a snapshot.
     */
    function deepFreeze<T>(x: T): T {
      if (x && typeof x === 'object' && !Object.isFrozen(x)) {
        Object.freeze(x)
        for (const value of Object.values(x)) {
          deepFreeze(value)
        }
      }
      return x
    }

    function accountWithSecurity(security: LocalIdpAccount['security']): LocalIdpAccount {
      return {
        id: 'account1',
        username: seed.username,
        hashedPassword: seed.hashedPassword,
        previousHashedPasswords: [ ...seed.previousHashedPasswords ],
        createdAt: new Date(seed.createdAt),
        lastUpdated: new Date(seed.lastUpdated),
        security: { ...security, lockedUntil: security.lockedUntil && new Date(security.lockedUntil) },
      }
    }

    function snapshotOf(account: LocalIdpAccount): LocalIdpAccount {
      return accountWithSecurity(account.security)
    }

    const unlocked = { locked: false, lockedUntil: null, invalidLoginAttempts: 0, numberOfTimesLocked: 0 }
    const scenarios: { name: string, security: LocalIdpAccount['security'], lockPolicy: AccountLockPolicy }[] = [
      { name: 'unlocked', security: unlocked, lockPolicy: enabledLock },
      {
        name: 'one attempt below the lock threshold',
        security: { ...unlocked, invalidLoginAttempts: threshold - 1 },
        lockPolicy: enabledLock
      },
      {
        name: 'locked until a future time',
        security: { locked: true, lockedUntil: new Date(now + 60_000), invalidLoginAttempts: threshold, numberOfTimesLocked: 1 },
        lockPolicy: enabledLock
      },
      {
        name: 'locked until a past time',
        security: { locked: true, lockedUntil: new Date(now - 60_000), invalidLoginAttempts: threshold, numberOfTimesLocked: 1 },
        lockPolicy: enabledLock
      },
      {
        name: 'locked indefinitely',
        security: { locked: true, lockedUntil: null, invalidLoginAttempts: threshold, numberOfTimesLocked: enabledLock.disableAfterLockCount },
        lockPolicy: enabledLock
      },
      {
        name: 'locked while the policy is disabled',
        security: { locked: true, lockedUntil: new Date(now + 60_000), invalidLoginAttempts: threshold, numberOfTimesLocked: 1 },
        lockPolicy: disabledLock
      },
    ]

    for (const scenario of scenarios) {
      for (const [ passwordDescription, attemptedPassword ] of [ [ 'correct', password ], [ 'mismatched', 'wrong' ] ]) {

        it(`is not modified when ${scenario.name} with a ${passwordDescription} password`, async function() {

          const account = deepFreeze(accountWithSecurity(scenario.security))
          const snapshot = snapshotOf(account)
          await attemptAuthentication(account, attemptedPassword, scenario.lockPolicy)
          expect(account).to.deep.equal(snapshot)
        })
      }
    }
  })
})
