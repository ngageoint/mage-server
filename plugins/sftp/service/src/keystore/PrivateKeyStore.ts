/**
 * Storage abstraction for the SFTP plugin's private key. Implementations
 * decide where the key material actually lives so the controller never
 * needs to know or care.
 */
export interface PrivateKeyStore {

  /**
   * Returns whether a private key is currently stored, without exposing its value.
   */
  hasPrivateKey(): Promise<boolean>

  /**
   * Returns the private key contents, or undefined if none has been saved yet.
   */
  getPrivateKey(): Promise<string | undefined>

  /**
   * Persists the given private key, overwriting any existing key.
   */
  savePrivateKey(key: string): Promise<void>

  /**
   * Removes the stored private key, if any.
   */
  removePrivateKey(): Promise<void>
}
