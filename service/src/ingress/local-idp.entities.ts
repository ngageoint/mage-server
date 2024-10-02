import moment from 'moment'
import { PasswordRequirements, validatePasswordRequirements } from '../utilities/password-policy'
import { defaultHashUtil } from '../utilities/password-hashing'

export interface LocalIdpAccount {
  username: string
  createdAt: Date
  lastUpdated: Date
  hashedPassword: string
  previousHashedPasswords: string[]
  security: {
    locked: boolean
    /**
     * When `lockedUntil` is `null`, the account is locked indefinitely.
     */
    lockedUntil: Date | null
    invalidLoginAttempts: number
    numberOfTimesLocked: number
  }
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

export interface SecurityPolicy {
  passwordRequirements: PasswordRequirements
  accountLock: AccountLockPolicy
}

export interface LocalIdpRepository {
  readSecurityPolicy(): Promise<SecurityPolicy>
  // updateSecurityPolicy(policy: SecurityPolicy): Promise<SecurityPolicy>
  createLocalAccount(account: LocalIdpAccount): Promise<LocalIdpAccount | LocalIdpDuplicateUsernameError>
  readLocalAccount(username: string): Promise<LocalIdpAccount | null>
  updateLocalAccount(update: Partial<LocalIdpAccount> & Pick<LocalIdpAccount, 'username'>): Promise<LocalIdpAccount | null>
  deleteLocalAccount(username: string): Promise<LocalIdpAccount | null>
}

export async function prepareNewAccount(username: string, password: string, policy: SecurityPolicy): Promise<LocalIdpAccount | LocalIdpInvalidPasswordError> {
  const passwordRequirements = policy.passwordRequirements
  const passwordValidation = await validatePasswordRequirements(password, passwordRequirements, [])
  if (!passwordValidation.valid) {
    return invalidPasswordError(passwordValidation.errorMessage || 'Password does not meet requirements.')
  }
  const hashedPassword = await defaultHashUtil.hashPassword(password)
  const now = new Date()
  const account: LocalIdpAccount = {
    username,
    hashedPassword: defaultHashUtil.serializePassword(hashedPassword),
    previousHashedPasswords: [],
    createdAt: now,
    lastUpdated: now,
    security: {
      invalidLoginAttempts: 0,
      locked: false,
      lockedUntil: null,
      numberOfTimesLocked: 0
    }
  }
  return account
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

export type LocalIdpAuthenticationResult = { authenticated: LocalIdpAccount, failed: false } | { authenticated: false, failed: LocalIdpFailedAuthenticationError }

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

export class LocalIdpError extends Error {
}

export class LocalIdpInvalidPasswordError extends LocalIdpError {
}

export class LocalIdpDuplicateUsernameError extends LocalIdpError {
  constructor(public username: string) {
    super(`duplicate account username: ${username}`)
  }
}

export class LocalIdpFailedAuthenticationError extends LocalIdpError {
  constructor(public account: LocalIdpAccount, message: string = `failed to authenticate user ${account.username}`) {
    super(message)
  }
}

function invalidPasswordError(reason: string): LocalIdpError {
  return new LocalIdpError(reason)
}

function passwordMismatchError(account: LocalIdpAccount): LocalIdpFailedAuthenticationError {
  return new LocalIdpFailedAuthenticationError(account, `invalid password for user ${account.username}`)
}

function accountLockedError(account: LocalIdpAccount): LocalIdpFailedAuthenticationError {
  return new LocalIdpFailedAuthenticationError(account, `account for user ${account.username} is locked${account.security.lockedUntil ? account.security.lockedUntil.toUTCString() : ''}`)
}