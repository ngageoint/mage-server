import crypto from 'crypto'
import util from 'util'

const digest = 'sha512'
const pbkdf2_promise = util.promisify(crypto.pbkdf2)

export type PasswordHash = {
  salt: string
  derivedKey: string
  derivedKeyLength: number
  iterations: number
}

/**
 * Serialize a password hash object into a string comprising all the information
 * necessary to verify a password.  The string contains the salt, derived key,
 * derived key length, and number of iterations.
 */
export function serializeHashedPassword(hashed: PasswordHash): string {
  return `${hashed.salt}::${hashed.derivedKey}::${hashed.derivedKeyLength}::${hashed.iterations}`
}

/**
 * Deserialize a string into a password object.
 * The info is salt, derivedKey, derivedKey length and number of iterations
 */
export function parseHashedPassword(hashed: string): PasswordHash {
  const items = hashed.split('::')
  return {
    salt: items[0],
    derivedKey: items[1],
    derivedKeyLength: parseInt(items[2], 10),
    iterations: parseInt(items[3], 10)
  }
}

export type PasswordHashSpec = {
  iterations: number
  saltLength: number
  derivedKeyLength: number
}

export const defaultPasswordHashSpec = Object.freeze<PasswordHashSpec>({
  iterations: 12000,
  saltLength: 128,
  derivedKeyLength: 256,
})

export class PasswordHashUtil {

  readonly #iterations: number
  readonly #saltLength: number
  readonly #derivedKeyLength: number

  constructor(spec: Partial<PasswordHashSpec> = defaultPasswordHashSpec) {
    this.#iterations = spec.iterations || defaultPasswordHashSpec.iterations
    this.#saltLength = spec.saltLength || defaultPasswordHashSpec.saltLength
    this.#derivedKeyLength = spec.derivedKeyLength || defaultPasswordHashSpec.derivedKeyLength
  }

  /**
   * Hash a password using Node crypto's PBKDF2
   * Description here: http://en.wikipedia.org/wiki/PBKDF2
   * Number of iterations are saved in case we change the setting in the future
   */
  async hashPassword(password: string): Promise<PasswordHash> {
    const salt = crypto.randomBytes(this.#saltLength).toString('base64')
    // TODO: upgrade hash algorithm
    const derivedKey = await pbkdf2_promise(password, salt, this.#iterations, this.#derivedKeyLength, digest)
    return {
      salt,
      iterations: this.#iterations,
      derivedKeyLength: this.#derivedKeyLength,
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
    const hash = parseHashedPassword(serializedHash)
    if (!hash.salt || !hash.derivedKey || !hash.iterations || !hash.derivedKeyLength) {
      throw new Error('invalid password hash')
    }
    const testHash = await pbkdf2_promise(password, hash.salt, hash.iterations, hash.derivedKeyLength, digest)
    return testHash.toString('base64') === hash.derivedKey
  }
}

export const defaultHashUtil = new PasswordHashUtil()
