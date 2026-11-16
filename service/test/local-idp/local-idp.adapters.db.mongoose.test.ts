import { expect } from 'chai'
import assert from 'node:assert'
import {
  createLocalIdpModels, LocalIdpAccountModel, LocalIdpSecurityPolicyModel, MongooseLocalIdpRepository
} from '../../lib/local-idp/local-idp.adapters.db.mongoose'
import {
  defaultLocalIdpSecurityPolicy, LocalIdpAccount, LocalIdpAccountSeed, LocalIdpErrorCode, prepareNewAccount,
  validateAccountLockPolicy, ValidAccountLockPolicy, ValidLocalIdpSecurityPolicy
} from '../../lib/local-idp/local-idp.entities'
import { PasswordRequirements } from '../../lib/local-idp/password-requirements'
import { mongoTestAfterAllHook, mongoTestBeforeAllHook, MongoTestContext } from '../mongo.test'

const laxPasswords: PasswordRequirements = Object.freeze({})

function validPolicy(accountLock: Partial<ValidAccountLockPolicy>, passwordRequirements: PasswordRequirements): ValidLocalIdpSecurityPolicy {
  const validLock = validateAccountLockPolicy({ ...defaultLocalIdpSecurityPolicy.accountLock, ...accountLock })
  assert(validLock instanceof ValidAccountLockPolicy, 'expected instance of ValidAccountLockPolicy')
  return { accountLock: validLock, passwordRequirements }
}

async function newAccountSeed(username: string, password = 'just for testing'): Promise<LocalIdpAccountSeed> {
  const seed = await prepareNewAccount(username, password, laxPasswords)
  assert(seed instanceof LocalIdpAccountSeed, 'expected instance of LocalIdpAccountSeed')
  return seed
}

describe.only('local idp mongoose repository', function() {

  let policyModel: LocalIdpSecurityPolicyModel
  let accountModel: LocalIdpAccountModel
  let repo: MongooseLocalIdpRepository

  before(mongoTestBeforeAllHook())

  before(async function() {
    const mongo = this.mongo as MongoTestContext
    const models = createLocalIdpModels(mongo.conn)
    policyModel = models.securityPolicy
    accountModel = models.account
    // build the unique username index before any test relies on it
    await Promise.all([ policyModel.init(), accountModel.init() ])
    repo = new MongooseLocalIdpRepository(policyModel, accountModel)
  })

  afterEach(async function() {
    await Promise.all([ policyModel.deleteMany({}), accountModel.deleteMany({}) ])
  })

  after(mongoTestAfterAllHook())

  describe('security policy', function() {

    it('returns null without saving a policy when no policy exists', async function() {

      const read = await repo.readSecurityPolicy()

      expect(read).to.be.null
      expect(await policyModel.countDocuments()).to.equal(0)
    })

    it('reads the saved policy', async function() {

      const policy = validPolicy(
        { enabled: true, lockAfterInvalidLoginCount: 7, lockDurationSeconds: 300, disableAfterLockCount: 2 },
        { minChars: 10, minCharsEnabled: true, numbers: 2, numbersEnabled: true, helpText: 'be creative' })

      const saved = await repo.saveSecurityPolicy(policy)
      const read = await repo.readSecurityPolicy()

      const expected = { accountLock: { ...policy.accountLock }, passwordRequirements: policy.passwordRequirements }
      expect(saved).to.deep.equal(expected)
      expect(read).to.deep.equal(expected)
    })

    it('replaces the existing policy', async function() {

      await repo.saveSecurityPolicy(validPolicy({ lockDurationSeconds: 60 }, { minChars: 8, minCharsEnabled: true }))
      const replacement = validPolicy({ lockDurationSeconds: 90 }, { highLetters: 1, highLettersEnabled: true })

      const saved = await repo.saveSecurityPolicy(replacement)
      const read = await repo.readSecurityPolicy()

      const expected = { accountLock: { ...replacement.accountLock }, passwordRequirements: replacement.passwordRequirements }
      expect(saved).to.deep.equal(expected)
      expect(read).to.deep.equal(expected)
      expect(await policyModel.countDocuments()).to.equal(1)
    })
  })

  describe('accounts', function() {

    describe('create', function() {

      it('creates an account from a seed', async function() {

        const seed = await newAccountSeed('creator')

        const created = await repo.createLocalAccount(seed)

        assert(!(created instanceof Error), 'expected an account')
        expect(created.id).to.be.a('string').that.matches(/^[0-9a-f]{24}$/)
        expect(created).to.not.have.property('_id')
        expect(created.username).to.equal('creator')
        expect(created.hashedPassword).to.equal(seed.hashedPassword)
        expect(created.previousHashedPasswords).to.deep.equal([])
        expect(created.security).to.deep.equal(seed.security)
        expect(created.createdAt).to.be.instanceOf(Date)
        expect(created.lastUpdated).to.be.instanceOf(Date)
      })

      it('returns an error for a duplicate username', async function() {

        const existing = await repo.createLocalAccount(await newAccountSeed('taken'))
        assert(!(existing instanceof Error), 'expected an account')

        const duplicate = await repo.createLocalAccount(await newAccountSeed('taken', 'a different password'))

        assert(duplicate instanceof Error, 'expected an error')
        expect(duplicate.code).to.equal(LocalIdpErrorCode.DuplicateUserName)
        expect(duplicate.username).to.equal('taken')
        expect(await accountModel.countDocuments()).to.equal(1)
      })
    })

    describe('read', function() {

      it('reads an account by username', async function() {

        const created = await repo.createLocalAccount(await newAccountSeed('reader'))
        assert(!(created instanceof Error), 'expected an account')
        await repo.createLocalAccount(await newAccountSeed('someone else'))

        const read = await repo.readLocalAccount('reader')

        expect(read).to.deep.equal(created)
      })

      it('returns null when no account matches the username', async function() {

        await repo.createLocalAccount(await newAccountSeed('exists'))

        const read = await repo.readLocalAccount('does not exist')

        expect(read).to.be.null
      })
    })

    describe('update', function() {

      async function createAccount(username: string): Promise<LocalIdpAccount> {
        const created = await repo.createLocalAccount(await newAccountSeed(username))
        assert(!(created instanceof Error), 'expected an account')
        return created
      }

      it('replaces the stored account', async function() {

        const created = await createAccount('updater')
        const replacementSeed = await newAccountSeed('updater', 'a new password')
        const update: LocalIdpAccount = {
          ...created,
          hashedPassword: replacementSeed.hashedPassword,
          previousHashedPasswords: [ created.hashedPassword ],
          security: {
            locked: true,
            lockedUntil: new Date(Date.now() + 60_000),
            invalidLoginAttempts: 3,
            numberOfTimesLocked: 1,
          }
        }

        const updated = await repo.updateLocalAccount(update)
        const read = await repo.readLocalAccount('updater')

        assert(updated, 'expected an updated account')
        const { lastUpdated, ...expectedWithoutLastUpdated } = update
        expect(updated).to.deep.include(expectedWithoutLastUpdated)
        expect(updated.lastUpdated).to.be.instanceOf(Date)
        expect(read).to.deep.equal(updated)
      })

      it('unsets the lock expiration', async function() {

        const created = await createAccount('unlocker')
        const locked = await repo.updateLocalAccount({
          ...created,
          security: { locked: true, lockedUntil: new Date(Date.now() + 60_000), invalidLoginAttempts: 3, numberOfTimesLocked: 1 }
        })
        assert(locked, 'expected an updated account')

        const unlocked = await repo.updateLocalAccount({
          ...locked,
          security: { locked: false, lockedUntil: null, invalidLoginAttempts: 0, numberOfTimesLocked: 0 }
        })
        const read = await repo.readLocalAccount('unlocker')

        const expectedSecurity = { locked: false, lockedUntil: null, invalidLoginAttempts: 0, numberOfTimesLocked: 0 }
        expect(unlocked?.security).to.deep.equal(expectedSecurity)
        expect(read?.security).to.deep.equal(expectedSecurity)
      })

      it('does not modify other accounts', async function() {

        const target = await createAccount('target')
        const bystander = await createAccount('bystander')

        await repo.updateLocalAccount({ ...target, security: { ...target.security, invalidLoginAttempts: 2 } })

        expect(await repo.readLocalAccount('bystander')).to.deep.equal(bystander)
      })

      it('returns null when the account does not exist', async function() {

        const created = await createAccount('ghost')
        await repo.deleteLocalAccount('ghost')

        const updated = await repo.updateLocalAccount(created)

        expect(updated).to.be.null
        expect(await accountModel.countDocuments()).to.equal(0)
      })
    })

    describe('delete', function() {

      it('deletes and returns the account', async function() {

        const created = await repo.createLocalAccount(await newAccountSeed('deleter'))
        assert(!(created instanceof Error), 'expected an account')
        const bystander = await repo.createLocalAccount(await newAccountSeed('bystander'))

        const deleted = await repo.deleteLocalAccount('deleter')

        expect(deleted).to.deep.equal(created)
        expect(await repo.readLocalAccount('deleter')).to.be.null
        expect(await repo.readLocalAccount('bystander')).to.deep.equal(bystander)
      })

      it('returns null when the account does not exist', async function() {

        const deleted = await repo.deleteLocalAccount('does not exist')

        expect(deleted).to.be.null
      })
    })
  })
})
