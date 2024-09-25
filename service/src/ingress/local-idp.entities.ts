import { PasswordRequirements } from '../utilities/password-policy'
import { IdentityProvider } from './ingress.entities'

export interface LocalIdpAccount {
  username: string
  createdAt: Date
  lastUpdated: Date
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
  // readSecurityPolicy(): Promise<SecurityPolicy>
  // updateSecurityPolicy(policy: SecurityPolicy): Promise<SecurityPolicy>
  createLocalAccount(account: LocalIdpAccount): Promise<LocalIdpAccount | DuplicateUsernameError>
  readLocalAccount(username: string): Promise<LocalIdpAccount | null>
  updateLocalAccount(update: Partial<LocalIdpAccount> & Pick<LocalIdpAccount, 'username'>): Promise<LocalIdpAccount | null>
  deleteLocalAccount(username: string): Promise<LocalIdpAccount | null>
}

export function localIdpSecurityPolicyFromIdenityProvider(localIdp: IdentityProvider): SecurityPolicy {
  const settings = localIdp.protocolSettings
  return {
    accountLock: { ...settings.accountLock },
    passwordRequirements: { ...settings.passwordPolicy }
  }
}

export class LocalIdpError extends Error {

}

export class DuplicateUsernameError extends LocalIdpError {

  constructor(public username: string) {
    super(`duplicate account username: ${username}`)
  }
}