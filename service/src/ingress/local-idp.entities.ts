import { PasswordRequirements } from '../utilities/password-policy'

export type LocalIdpAccountId = string

export interface LocalIdpAccount {
  id: LocalIdpAccountId
  hashedPassword: string
  previousHashedPasswords: string[]
  security: {
    locked: boolean
    lockedUntil: Date
    invalidLoginAttempts: number
    numberOfTimesLocked: number
  }
}

export interface LocalIdpEnrollment {
  username: string
  password: string
  displayName: string
  email?: string
  phone?: string
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
  updateSecurityPolicy(policy: SecurityPolicy): Promise<SecurityPolicy>
  createLocalAccount(account: LocalIdpAccount): Promise<LocalIdpAccount>
  readLocalAccount(id: LocalIdpAccountId): Promise<LocalIdpAccount | null>
  updateLocalAccount(update: Partial<LocalIdpAccount> & Pick<LocalIdpAccount, 'id'>): Promise<LocalIdpAccount | null>
  deleteLocalAccount(id: LocalIdpAccountId): Promise<LocalIdpAccount | null>
}