import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { ArchiveFormat, CompletionAction, TriggerRule } from '../format/entities.format';
import * as CryptoJS from 'crypto-js';
import { error } from 'console';

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

// NOTE: default INSECURE salt value, recommend generate new UUID before deployment, **NOT** after deployment
const salt = process.env.SFTP_PLUGIN_CONFIG_SALT;

export async function encryptDecrypt(config: SFTPPluginConfig, isEncrypt: boolean): Promise<SFTPPluginConfig> {
  try {
    let tempConfig = config;
    if(salt === undefined) { throw new Error("No salt value found, update docker-compose value...") }
    const encryptedPass = isEncrypt ?
      CryptoJS.AES.encrypt(config.sftpClient.password, salt).toString() :
      CryptoJS.AES.decrypt(config.sftpClient.password, salt).toString();
    tempConfig.sftpClient.password = encryptedPass;
    return tempConfig;
  } catch (err) {
    throw err;
  }
}
