import moment from 'moment'
import assert from 'node:assert'
import { defaultHashUtil, serializeHashedPassword } from './password-hashing'
import { PasswordRequirements, validatePasswordRequirements } from './password-requirements'

export type LocalIdpAccount = {
  /**
   * TODO: users-next: remove and use username for primary key?
   */
  id: string
  username: string
  /**
   * TODO: move away from mutable dates
   */
  createdAt: Date
  lastUpdated: Date
  hashedPassword: string
  previousHashedPasswords: string[]
  security: LocalIdpAccountSecurityStatus
}

export type LocalIdpAccountSecurityStatus = {
  locked: boolean
  /**
   * When `lockedUntil` is `null`, the account is locked indefinitely.
   */
  lockedUntil: Date | null
  invalidLoginAttempts: number
  numberOfTimesLocked: number
}

export interface LocalIdpCredentials {
  username: string
  password: string
}

export interface AccountLockPolicy {
  enabled: boolean
  /**
   * The number of failed login attempts allowed before locking the account
   */
  lockAfterInvalidLoginCount: number
  /**
   * The duration in seconds to lock an account after reaching the failed login threshold
   */
  lockDurationSeconds: number
  /**
   * The number of account locks allowed before disabling the account
   */
  disableAfterLockCount: number
}

export type LocalIdpSecurityPolicy = {
  passwordRequirements: PasswordRequirements
  accountLock: AccountLockPolicy
}

export const defaultLocalIdpSecurityPolicy = Object.freeze({
  accountLock: Object.freeze({
    enabled: false,
    lockAfterInvalidLoginCount: 5,
    lockDurationSeconds: 120,
    disableAfterLockCount: 3,
  }),
  passwordRequirements: Object.freeze({
    minChars: 14,
    minCharsEnabled: true,
  })
} satisfies LocalIdpSecurityPolicy)

export interface LocalIdpRepository {
  readSecurityPolicy(): Promise<LocalIdpSecurityPolicy>
  saveSecurityPolicy(policy: LocalIdpSecurityPolicy): Promise<LocalIdpSecurityPolicy>
  createLocalAccount(account: LocalIdpAccountSeed): Promise<LocalIdpAccount | LocalIdpDuplicateUsernameError>
  readLocalAccount(username: string): Promise<LocalIdpAccount | null>
  /**
   * Update the given account with straight-forward PUT semantics.
   */
  updateLocalAccount(account: LocalIdpAccount): Promise<LocalIdpAccount | null>
  deleteLocalAccount(username: string): Promise<LocalIdpAccount | null>
}

export type LocalIdpAccountSeedSpec = Omit<LocalIdpAccount, 'id' | 'createdAt' | 'lastUpdated'>

const LocalIdpAccountSeedConstructorToken = Symbol()

export class LocalIdpAccountSeed implements Readonly<LocalIdpAccountSeedSpec> {

  readonly username: string
  readonly hashedPassword: string
  readonly previousHashedPasswords: string[]
  readonly createdAt: Date
  readonly lastUpdated: Date
  readonly security: LocalIdpAccountSecurityStatus

  constructor(token: unknown, spec: LocalIdpAccountSeedSpec) {
    assert(token === LocalIdpAccountSeedConstructorToken, 'illegal private constructor call')
    this.username = spec.username.toLowerCase()
    this.hashedPassword = spec.hashedPassword
    this.previousHashedPasswords = spec.previousHashedPasswords
    this.lastUpdated = this.createdAt = new Date()
    this.security = { ...spec.security }
  }
}

/**
 * Hash the given password and return a new account seed object suitable to persist.
 */
export async function prepareNewAccount(username: string, password: string, passwordRequirements: PasswordRequirements = defaultLocalIdpSecurityPolicy.passwordRequirements): Promise<LocalIdpAccountSeed | LocalIdpInvalidPasswordError> {
  const passwordValidation = await validatePasswordRequirements(password, passwordRequirements, [])
  if (!passwordValidation.valid) {
    return invalidPasswordError(username, passwordRequirements, passwordValidation.errorMessage || 'Password does not meet requirements.')
  }
  const hashedPassword = await defaultHashUtil.hashPassword(password)
  return new LocalIdpAccountSeed(LocalIdpAccountSeedConstructorToken, {
    username,
    hashedPassword: serializeHashedPassword(hashedPassword),
    previousHashedPasswords: [],
    security: {
      invalidLoginAttempts: 0,
      locked: false,
      lockedUntil: null,
      numberOfTimesLocked: 0
    }
  })
}

export function verifyPasswordForAccount(account: LocalIdpAccount, password: string): Promise<boolean> {
  return defaultHashUtil.validPassword(password, account.hashedPassword)
}

export function applyPolicyForFailedAuthenticationAttempt(account: LocalIdpAccount, policy: AccountLockPolicy): LocalIdpAccount {
  if (!policy.enabled) {
    return account
  }
  const accountStatus = { ...account.security }
  accountStatus.invalidLoginAttempts += 1
  if (accountStatus.invalidLoginAttempts >= policy.lockAfterInvalidLoginCount) {
    accountStatus.locked = true
    accountStatus.numberOfTimesLocked += 1
    if (accountStatus.numberOfTimesLocked >= policy.disableAfterLockCount) {
      accountStatus.lockedUntil = null
    }
    else {
      accountStatus.lockedUntil = moment().add(policy.lockDurationSeconds, 'seconds').toDate()
    }
  }
  else {
    accountStatus.locked = false
    accountStatus.lockedUntil = null
  }
  return {
    ...account,
    security: accountStatus
  }
}

export type LocalIdpAuthenticationResult = { authenticated: LocalIdpAccount, failed: false } | { authenticated: false, failed: LocalIdpAccountLockedError | LocalIdpAccountNotFoundError | LocalIdpPasswordMismatchError }

/**
 * Check whether the given password matches the given account's password.  If the password does not match, or the
 * account is locked, return an error whose account object reflects the given account lock policy.  If the password
 * matches, return the given account with {@link unlockAndResetSecurityStatus() good security status}.
 */
export async function attemptAuthentication(account: LocalIdpAccount, password: string, policy: AccountLockPolicy): Promise<LocalIdpAuthenticationResult> {
  if (account.security.locked) {
    if (account.security.lockedUntil === null || account.security.lockedUntil.getTime() > Date.now()) {
      return { authenticated: false, failed: accountLockedError(account) }
    }
  }
  const passwordMatches = await verifyPasswordForAccount(account, password)
  if (passwordMatches) {
    return { authenticated: unlockAndResetSecurityStatusOfAccount(account), failed: false }
  }
  return { authenticated: false, failed: passwordMismatchError(applyPolicyForFailedAuthenticationAttempt(account, policy)) }
}

export function unlockAndResetSecurityStatusOfAccount(account: LocalIdpAccount): LocalIdpAccount {
  const accountStatus = { ...account.security }
  accountStatus.locked = false
  accountStatus.lockedUntil = null
  accountStatus.invalidLoginAttempts = 0
  accountStatus.numberOfTimesLocked = 0
  return {
    ...account,
    security: accountStatus
  }
}

export const LocalIdpErrorCode = Object.freeze({
  AccountLocked: 'LocalIdpError.AccountLocked',
  /**
   * The given username does not exist.
   */
  AccountNotFound: 'LocalIdpError.AccountNotFound',
  DuplicateUserName: 'LocalIdpError.DuplicateUserName',
  /**
   * The password did not satisfy the password policy requirements.
   */
  InvalidPassword: 'LocalIdpError.InvalidPassword',
  /**
   * The incoming username/password pair did not match the stored pair.
   */
  PasswordMismatch: 'LocalIdpError.PasswordMismatch',
} as const)

export type LocalIdpErrorCode = typeof LocalIdpErrorCode[keyof typeof LocalIdpErrorCode]

export type LocalIdpAccountLockedError = Error & {
  code: typeof LocalIdpErrorCode.AccountLocked
  account: LocalIdpAccount
}
export type LocalIdpAccountNotFoundError = Error & {
  code: typeof LocalIdpErrorCode.AccountNotFound
  username: string
}
export type LocalIdpDuplicateUsernameError = Error & {
  code: typeof LocalIdpErrorCode.DuplicateUserName
  username: string
}
export type LocalIdpInvalidPasswordError = Error & {
  code: typeof LocalIdpErrorCode.InvalidPassword
  username: string
  passwordRequirements: PasswordRequirements
}
export type LocalIdpPasswordMismatchError = Error & {
  code: typeof LocalIdpErrorCode.PasswordMismatch
  /**
   * The account after applying the failed login policy
   */
  account: LocalIdpAccount
}

/**
 * Create an object that extends an `Error` instance with the given data entries.
 */
function errorWithData<T extends Record<string, any>>(data: T, message?: string): Error & Readonly<T> {
  const propertyDefinitions = Object.entries(data).reduce<PropertyDescriptorMap>((propDefs, [key, value]) => {
    return { ...propDefs, [key]: { value, writable: false, configurable: false, enumerable: true }}
  }, {})
  return Object.create(new Error(message), propertyDefinitions)
}

function invalidPasswordError(username: string, passwordRequirements: PasswordRequirements, validationMessage?: string): LocalIdpInvalidPasswordError {
  return errorWithData({ code: LocalIdpErrorCode.InvalidPassword, username, passwordRequirements }, validationMessage)
}

function passwordMismatchError(account: LocalIdpAccount): LocalIdpPasswordMismatchError {
  return errorWithData({ code: LocalIdpErrorCode.PasswordMismatch, account }, `incorrect password for user ${account.username}`)
}

function accountLockedError(account: LocalIdpAccount): LocalIdpAccountLockedError {
  const message = `account for user ${account.username} is locked${account.security.lockedUntil ? account.security.lockedUntil.toUTCString() : ''}`
  return errorWithData({ code: LocalIdpErrorCode.AccountLocked, account }, message)
}

export function duplicateUsernameError(username: string): LocalIdpDuplicateUsernameError {
  return errorWithData({ code: LocalIdpErrorCode.DuplicateUserName, username })
}
