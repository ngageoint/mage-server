import { MageEventId } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { ArchiveFormat, CompletionAction, TriggerRule } from '../format/entities.format';

/**
 * Determines how the events list is applied when filtering which events to sync.
 * - All: Sync all active events
 * - Include: Sync only events selected
 * - Exclude: Sync all events except those selected
 */
export enum EventFilterMode {
  All = 'all',
  Include = 'include',
  Exclude = 'exclude'
}

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
   * Determines how the event sync filters events
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

export const defaultSFTPPluginConfig = Object.freeze<SFTPPluginConfig>({
  enabled: false,
  interval: 60,
  pageSize: 100,
  eventFilterMode: EventFilterMode.All,
  events: [],
  archiveFormat: ArchiveFormat.GeoJSON,
  completionAction: CompletionAction.None,
  initiation: {
    rule: TriggerRule.CreateAndUpdate,
    timeout: 60
  },
  sftpClient: {
    host: '',
    port: 22,
    path: '',
    username: ''
  }
})
