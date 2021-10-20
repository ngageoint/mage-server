export interface Authentication {
  id: string
  type: string
}

/**
 * TODO: move somewhere else
 */
export interface SecurityStatus {
  locked: boolean
  lockedUntil: Date
  invalidLoginAttempts: number
  numberOfTimesLocked: number
}
