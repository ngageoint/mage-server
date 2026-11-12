import { defaultHashUtil } from './password-hashing'

/**
 * Default allowed special characters.
 * TODO: missing /\+'`[] and space. why?
 */
const SPECIAL_CHARS = '~!@#$%^&*(),.?":{}|<>_=;-'

export type PasswordRequirements = Partial<{
  passwordMinLengthEnabled: boolean
  passwordMinLength: number
  minCharsEnabled: boolean
  /** Minimum number of alpha characters, A-Z, case-insensitive */
  minChars: number
  maxConCharsEnabled: boolean
  /** Maximum consecutive characters */
  maxConChars: number
  lowLettersEnabled: boolean
  /** Minimum lower-case letters */
  lowLetters: number
  highLettersEnabled: boolean
  /** Minimum upper-case letters */
  highLetters: number
  numbersEnabled: boolean
  /** Minimum numbers */
  numbers: number
  specialCharsEnabled: boolean
  /** Minimum special characters */
  specialChars: number
  restrictSpecialCharsEnabled: boolean
  /** Allow only these special characters */
  restrictSpecialChars: string
  passwordHistoryCountEnabled: boolean
  /** Maximum number of passwords to keep to compare for uniqueness */
  passwordHistoryCount: number
  /** Return the given help text in the password validation result to inform the user about the password requirements */
  helpText: string
}>

export type PasswordValidationResult = {
  valid: boolean
  errorMessage: string | null
}

export async function validatePasswordRequirements(password: string, policy: PasswordRequirements, previousPasswords: string[] = []): Promise<PasswordValidationResult> {
  if (!password) {
    return {
      valid: false,
      errorMessage: 'Password is missing'
    }
  }
  const valid =
    validatePasswordLength(policy, password) &&
    validateMinimumCharacters(policy, password) &&
    validateMaximumConsecutiveCharacters(policy, password) &&
    validateMinimumLowercaseCharacters(policy, password) &&
    validateMinimumUppercaseCharacters(policy, password) &&
    validateMinimumNumbers(policy, password) &&
    validateMinimumSpecialCharacters(policy, password) &&
    (await validatePasswordHistory(policy, password, previousPasswords))
  return { valid, errorMessage: valid ? null : (policy.helpText || 'The password does not meet complexity requirements.') }
}

function validatePasswordLength(policy: PasswordRequirements, password: string): boolean {
  if (!policy.passwordMinLengthEnabled || typeof policy.passwordMinLength !== 'number') {
    return true
  }
  return password.length >= policy.passwordMinLength
}

function validateMinimumCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.minCharsEnabled || typeof policy.minChars !== 'number') {
    return true
  }
  let letterCount = 0
  for (let i = 0; i < password.length; i++) {
    if (password[i].match(/[a-z]/i)) {
      letterCount++
    }
  }
  return letterCount >= policy.minChars
}

function validateMaximumConsecutiveCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.maxConCharsEnabled || typeof policy.maxConChars !== 'number') {
    return true
  }
  const tooManyConsecutiveLetters = new RegExp(`[a-z]{${policy.maxConChars + 1}}`, 'i')
  return !tooManyConsecutiveLetters.test(password)
}

function validateMinimumLowercaseCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.lowLettersEnabled || typeof policy.lowLetters !== 'number') {
    return true
  }
  let letterCount = 0
  for (let i = 0; i < password.length; i++) {
    if (/[a-z]/.test(password[i])) {
      letterCount++
    }
  }
  return letterCount >= policy.lowLetters
}

function validateMinimumUppercaseCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.highLettersEnabled || typeof policy.highLetters !== 'number') {
    return true
  }
  let letterCount = 0
  for (let i = 0; i < password.length; i++) {
    if (/[A-Z]/.test(password[i])) {
      letterCount++
    }
  }
  return letterCount >= policy.highLetters
}

function validateMinimumNumbers(policy: PasswordRequirements, password: string): boolean {
  if (!policy.numbersEnabled || typeof policy.numbers !== 'number') {
    return true
  }
  let numberCount = 0
  for (let i = 0; i < password.length; i++) {
    if (/[0-9]/.test(password[i])) {
      numberCount++
    }
  }
  return numberCount >= policy.numbers
}

function validateMinimumSpecialCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.specialCharsEnabled || typeof policy.specialChars !== 'number') {
    return true
  }
  const allowedChars = policy.restrictSpecialCharsEnabled && typeof policy.restrictSpecialChars === 'string'
    ? policy.restrictSpecialChars
    : null
  let specialCharCount = 0
  for (const char of password) {
    const isSpecialChar = SPECIAL_CHARS.includes(char)
    if (isSpecialChar) {
      if (allowedChars !== null && !allowedChars.includes(char)) {
        return false
      }
      specialCharCount++
    }
  }
  return specialCharCount >= policy.specialChars
}

async function validatePasswordHistory(policy: PasswordRequirements, password: string, previousPasswordHashes: string[]): Promise<boolean> {
  if (!policy.passwordHistoryCountEnabled || !previousPasswordHashes) {
    return true
  }
  const truncatedHistory = previousPasswordHashes.slice(0, policy.passwordHistoryCount)
  for (const previousPasswordHash of truncatedHistory) {
    const used = await defaultHashUtil.validPassword(password, previousPasswordHash)
    if (used) {
      return false
    }
  }
  return true
}
