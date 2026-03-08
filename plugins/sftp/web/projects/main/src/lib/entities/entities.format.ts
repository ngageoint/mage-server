export enum ArchiveFormat {
  GeoJSON = "GeoJSON"
}

export enum CompletionAction {
  None = "None",
  Archive = "Archive"
}

export enum TriggerRule {
  Create = "Create",
  CreateAndUpdate = "CreateAndUpdate"
}

/**
 * Determines how the events list is applied when filtering which events to sync.
 * - All: Sync all active events (ignore the events list)
 * - Include: Only sync events in the events list
 * - Exclude: Sync all active events except those in the events list
 */
export enum EventFilterMode {
  All = 'all',
  Include = 'include',
  Exclude = 'exclude'
}

/**
 * Summary of a MAGE event for display in the configuration UI
 */
export interface MageEventSummary {
  id: number
  name: string
}

/**
 * Represents the result of a connection test to the SFTP server
 */
export interface ConnectionTestResult {
  success: boolean
  message: string
  timestamp?: Date
}

/**
 * Represents the current status of the SFTP plugin
 */
export interface PluginStatus {
  connected: boolean
  lastError?: string
  lastSync?: Date
  lastConnectionAttempt?: Date
}

export type MageEventId = number

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
   * Determines how the events list is applied: 'all' syncs everything,
   * 'include' syncs only listed events, 'exclude' syncs all except listed events.
   */
  eventFilterMode: EventFilterMode

  /**
   * Events to include or exclude based on eventFilterMode
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
    port: number,
    path: string,
    username: string
  }
}
