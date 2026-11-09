import { defaultHashUtil } from './password-hashing'

const SPECIAL_CHARS = '~!@#$%^&*(),.?":{}|<>_=;-'

export type PasswordRequirements = {
  passwordMinLengthEnabled: boolean
  passwordMinLength: number
  /** Minimum number of alpha characters, A-Z, case-insensitive */
  minCharsEnabled: boolean
  minChars: number
  maxConCharsEnabled: boolean
  maxConChars: number
  lowLettersEnabled: boolean
  lowLetters: number
  highLettersEnabled: boolean
  highLetters: number
  numbersEnabled: boolean
  numbers: number
  specialCharsEnabled: boolean
  specialChars: number
  restrictSpecialCharsEnabled: boolean
  restrictSpecialChars: string
  passwordHistoryCountEnabled: boolean
  passwordHistoryCount: number
  helpText: string
}

export type PasswordValidationResult = {
  valid: boolean
  errorMessage: string | null
}

export async function validatePasswordRequirements(password: string, policy: PasswordRequirements, previousPasswords: string[]): Promise<PasswordValidationResult> {
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
  return { valid, errorMessage: valid ? null : policy.helpText }
}

function validatePasswordLength(policy: PasswordRequirements, password: string): boolean {
  return policy.passwordMinLengthEnabled &&
    password.length >= policy.passwordMinLength
}

function validateMinimumCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.minCharsEnabled) {
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
  if (!policy.maxConCharsEnabled) {
    return true
  }
  const tooManyConsecutiveLetters = new RegExp(`[a-z]{${policy.maxConChars + 1}}`, 'i')
  return !tooManyConsecutiveLetters.test(password)
}

function validateMinimumLowercaseCharacters(policy: PasswordRequirements, password: string): boolean {
  if (!policy.lowLettersEnabled) {
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
  if (!policy.highLettersEnabled) {
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
  if (!policy.numbersEnabled) {
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
  if (!policy.specialCharsEnabled) {
    return true
  }
  let allowedChars = null
  let forbiddenChars = null
  if (policy.restrictSpecialCharsEnabled) {
    forbiddenChars = new RegExp('[' + createRestrictedRegex(policy.restrictSpecialChars) + ']')
    allowedChars = new RegExp('[' + policy.restrictSpecialChars + ']')
  }
  else {
    allowedChars = new RegExp('[' + SPECIAL_CHARS + ']')
  }
  let specialCharCount = 0
  for (let i = 0; i < password.length && specialCharCount < policy.specialChars && specialCharCount > -1; i++) {
    const char = password[i]
    if (forbiddenChars && forbiddenChars.test(char)) {
      specialCharCount = -1
    }
    else if (allowedChars.test(char)) {
      specialCharCount++
    }
  }
  return specialCharCount >= policy.specialChars
}

function createRestrictedRegex(restrictedChars: string): string {
  let forbiddenRegex = ''
  for (let i = 0; i < SPECIAL_CHARS.length; i++) {
    const specialChar = SPECIAL_CHARS[i]
    if (!restrictedChars.includes(specialChar)) {
      forbiddenRegex += specialChar
    }
  }
  return forbiddenRegex
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
