import crypto from 'crypto'
import util from 'util'

const digest = 'sha512'
const pbkdf2_promise = util.promisify(crypto.pbkdf2)

export type HashedPassword = {
  salt: string
  derivedKey: string
  derivedKeyLength: number
  iterations: number
}

export function formatHashedPassword(hashed: HashedPassword): string {
  return `${hashed.salt}::${hashed.derivedKey}::${hashed.derivedKeyLength}::${hashed.iterations}`
}

export type PasswordHashOptions = {
  iterations?: number
  saltLength?: number
  derivedKeyLength?: number
}

export const defaultPasswordHashOptions = {
  iterations: 12000,
  saltLength: 128,
  derivedKeyLength: 256,
} as const

export class PasswordHashUtil {

  private iterations: number
  private saltLength: number
  private derivedKeyLength: number

  constructor(readonly options = defaultPasswordHashOptions) {
    this.iterations = options.iterations || defaultPasswordHashOptions.iterations
    this.saltLength = options.saltLength || defaultPasswordHashOptions.saltLength
    this.derivedKeyLength = options.derivedKeyLength || defaultPasswordHashOptions.derivedKeyLength
  }

  /**
   * Serialize a password object containing all the information needed to check a password into a string
   * The info is salt, derivedKey, derivedKey length and number of iterations
   */
  serializePassword(hashed: HashedPassword): string {
    return formatHashedPassword(hashed)
  }

  /**
   * Deserialize a string into a password object.
   * The info is salt, derivedKey, derivedKey length and number of iterations
   */
  deserializePassword(password: string): HashedPassword {
    const items = password.split('::')
    return {
      salt: items[0],
      derivedKey: items[1],
      derivedKeyLength: parseInt(items[2], 10),
      iterations: parseInt(items[3], 10)
    }
  }
  /**
   * Hash a password using Node crypto's PBKDF2
   * Description here: http://en.wikipedia.org/wiki/PBKDF2
   * Number of iterations are saved in case we change the setting in the future
   */
  async hashPassword(password: string): Promise<HashedPassword> {
    const salt = crypto.randomBytes(this.saltLength).toString('base64')
    // TODO: upgrade hash algorithm
    const derivedKey = await pbkdf2_promise(password, salt, this.iterations, this.derivedKeyLength, digest)
    return {
      salt,
      iterations: this.iterations,
      derivedKeyLength: this.derivedKeyLength,
      derivedKey: derivedKey.toString('base64')
    }
  }

  /**
   * Compare a password to a password hash
   */
  async validPassword(password: string, serializedHash: string): Promise<boolean> {
    if (!serializedHash) {
      return false
    }
    const hash = this.deserializePassword(serializedHash)
    if (!hash.salt || !hash.derivedKey || !hash.iterations || !hash.derivedKeyLength) {
      throw new Error('invalid password hash')
    }
    const testHash = await pbkdf2_promise(password, hash.salt, hash.iterations, hash.derivedKeyLength, digest)
    return testHash.toString('base64') === hash.derivedKey
  }
}
