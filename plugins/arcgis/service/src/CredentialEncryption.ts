import { ArcGISIdentityManager } from '@esri/arcgis-rest-request'
import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const ALGORITHM = 'aes-256-gcm'
let cachedKey: Buffer | undefined

/**
 * Resolves the AES key used to encrypt/decrypt persisted ArcGIS credentials
 * @param console used to log messages
 * @returns the 32-byte AES-256 key
 */
function resolveEncryptionKey(console: Console): Buffer {
  if (cachedKey) {
    return cachedKey
  }
  const envKey = process.env.MAGE_ARCGIS_ENCRYPTION_KEY
  if (envKey) {
    cachedKey = scryptSync(envKey, 'mage-arcgis-credential-store', 32)
    return cachedKey
  }
  const securityDir = process.env.MAGE_SECURITY_DIR || '/var/lib/mage/security'
  const keyFile = path.join(securityDir, 'arcgis', 'credential-key')
  if (fs.existsSync(keyFile)) {
    cachedKey = fs.readFileSync(keyFile)
  } else {
    console.log(`Generating a new ArcGIS credential encryption key at ${keyFile}`)
    fs.mkdirSync(path.dirname(keyFile), { recursive: true })
    cachedKey = randomBytes(32)
    fs.writeFileSync(keyFile, cachedKey, { mode: 0o600 })
  }
  return cachedKey
}

/**
 * Serializes an ArcGISIdentityManager and encrypts it for storage in the plugin's persisted config
 * @param identityManager the identity to serialize and encrypt
 * @param console used to log messages
 * @returns the encrypted value, formatted as `v1:<iv>:<authTag>:<ciphertext>` (each base64-encoded)
 */
export function serializeAndEncrypt(identityManager: ArcGISIdentityManager, console: Console): string {
  const serialized = identityManager.serialize()
  const key = resolveEncryptionKey(console)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

/**
 * Decrypts a value produced by serializeAndEncrypt and reconstructs the identity manager.
 * Transparently handles values persisted before encryption was added
 * @param stored the persisted `FeatureServiceConfig.identityManager` value
 * @param console used to log messages
 * @returns the reconstructed identity manager
 * @throws if `stored` is neither legacy JSON nor a recognized encrypted format
 */
export function decryptAndDeserialize(stored: string, console: Console): ArcGISIdentityManager {
  if (stored.trim().startsWith('{')) {
    return ArcGISIdentityManager.deserialize(stored)
  }
  const [version, ivB64, authTagB64, ciphertextB64] = stored.split(':')
  if (version !== 'v1' || !ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error(`Unrecognized stored ArcGIS credential format: ${version}`)
  }
  const key = resolveEncryptionKey(console)
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]).toString('utf8')
  return ArcGISIdentityManager.deserialize(plaintext)
}

export function _resetKeyCacheForTests(): void {
  cachedKey = undefined
}
