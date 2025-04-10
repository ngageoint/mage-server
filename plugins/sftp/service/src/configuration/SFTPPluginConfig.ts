import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { ArchiveFormat, CompletionAction, TriggerRule } from '../format/entities.format';

/**
 * Contains various configuration values used by the plugin.
 */
export interface SFTPPluginConfig {

  /**
   * When true, the plugin will process new observations and send them to a configured SFTP endpoint.
   */
  enabled: boolean

  /**
   * Query the database for new observations to process at the given time interval in seconds.
   */
  interval: number

  /**
   * Observation query page size
   */
  pageSize: number

  /**
   * Events in which to SFTP observations
   */
  events: Array<MageEventId>

  /**
   * Specifies how to format the SFTP archive file
   */
  archiveFormat: ArchiveFormat

  /**
   * Action to perform on observation when SFTP is complete
   */
  completionAction: CompletionAction

  /**
   * When to to initiate SFTP
   */
  initiation: {
    rule: TriggerRule,
    timeout: number
  }

  /**
   * SFTP client configuartion
   */
  sftpClient: {
    host: string,
    path: string,
    username: string,
    password: string
  }
}

export const defaultSFTPPluginConfig = Object.freeze<SFTPPluginConfig>({
  enabled: false,
  interval: 60,
  pageSize: 100,
  events: [],
  archiveFormat: ArchiveFormat.GeoJSON,
  completionAction: CompletionAction.None,
  initiation: {
    rule: TriggerRule.CreateAndUpdate,
    timeout: 60
  },
  sftpClient: {
    host: '',
    path: '',
    username: '',
    password: ''
  }
})

export function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

export function stringToArrayBuffer(str: string): ArrayBuffer {
  let enc = new TextEncoder();
  return enc.encode(str);
}

export async function encryptDecrypt(config: SFTPPluginConfig, isEncrypt: boolean): Promise<SFTPPluginConfig> {
  let tempConfig = config;
  // const encodedPassword = stringToArrayBuffer(config.sftpClient.password)
  // const salt = 'db17cd34-d1fd-4ffc-a83c-e30a59c0fe81' // ***NOTE: This is the environment variable***
  const algoName = 'AES-GCM'
  const rawKey = new Uint8Array([
    109,151,76,33,232,253,176,90,94,40,146,227,139,208,245,139,69,215,55,197,43,122,160,178,228,104,4,115,138,159,119,49,
  ]);
  const importedKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: algoName, length: 256 },
    true,
    ['decrypt', 'encrypt']
  );
  console.log(`importedKey:${JSON.stringify(importedKey)}`)
  try {
    if (isEncrypt) {
      console.log(`pass before encrypt: ${config.sftpClient.password}`)
      const encryptedPassword = await crypto.subtle.encrypt(
        { name: algoName, iv: rawKey }, // algorithm
        importedKey, // CryptoKey
        stringToArrayBuffer(config.sftpClient.password), // BufferSource
      );
      console.log(`encryptedPassword:${encryptedPassword}`)
      tempConfig.sftpClient.password = arrayBufferToString(encryptedPassword);
    } else {
      console.log(`pass before decrypt: ${config.sftpClient.password}`)
      const decryptedPassword = await crypto.subtle.decrypt(
        { name: algoName, iv: rawKey }, // algorithm
        importedKey, // CryptoKey
        stringToArrayBuffer(config.sftpClient.password), // BufferSource
      );
      console.log(`decryptedPassword:${decryptedPassword}`)
      tempConfig.sftpClient.password = arrayBufferToString(decryptedPassword);
    }
  } catch (e) {
    console.log(`ERROR: encrypt/decrypt: ${e}`);
  }
  return tempConfig;
}
