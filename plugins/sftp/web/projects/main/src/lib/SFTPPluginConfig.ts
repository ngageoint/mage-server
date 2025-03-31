import { ArchiveFormat } from "./entities/entities.format"

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
  events: Array<number>

  /**
   * Specifies how to format the SFTP archive file
   */
  archiveFormat: ArchiveFormat

  /**
   * SFTP client configuartion
   */
  sftpConfiguration: {
    host: string,
    username: string,
    password: string
  }
}

export const defaultSFTPPluginConfig = Object.freeze<SFTPPluginConfig>({
  enabled: true,
  interval: 60,
  pageSize: 100,
  events: [],
  archiveFormat: ArchiveFormat.GeoJSON,
  sftpConfiguration: {
    host: '',
    username: '',
    password: ''
  }
})
