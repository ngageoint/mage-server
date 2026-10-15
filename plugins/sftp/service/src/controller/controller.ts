import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEvent, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { AttachmentStore, EventScopedObservationRepository, Observation, ObservationAttrs, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { UserRepository } from "@ngageoint/mage.service/lib/entities/users/entities.users";
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';
import SFTPClient from 'ssh2-sftp-client';
import { PassThrough } from 'stream';
import { SFTPPluginConfig, defaultSFTPPluginConfig } from '../configuration/SFTPPluginConfig';
import { ArchiveFormat, ArchiveStatus, ArchiverFactory, ArchiveResult, TriggerRule } from '../format/entities.format';
import { getEventsToSync } from '../entities/entities.events';
import fs from 'fs';
import path from 'path';
import { SftpAttrs, SftpObservationEventSummary, SftpObservationRepository, SftpStatus, MongooseSftpObservationRepository, SftpObservationModel } from '../adapters/adapters.sftp.mongoose';
import { Connection } from 'mongoose';

const { name: packageName } = require('../../package.json')

export interface ConnectionTestResult {
  success: boolean
  message: string
  timestamp?: Date
}

export class SftpController {

  private isRunning = false;

  private nextTimeout: NodeJS.Timeout | undefined;

  private eventRepository: MageEventRepository;

  private observationRepository: ObservationRepositoryForEvent;

  private sftpObservationRepository: SftpObservationRepository

  private stateRepository: PluginStateRepository<SFTPPluginConfig>;

  private configuration: SFTPPluginConfig | null = null;

  archiveFactory: ArchiverFactory

  /**
   * Timestamp (ms) when this controller instance was created. Used to prevent
   * backfilling observations that predate the plugin start.
   */
  private readonly pluginStartTime: number = Date.now()

  /**
   * Tracks which event IDs have already had their pre-start observations marked
   * SKIPPED, so the scan only runs once per process start per event.
   */
  private readonly startupSkipDone = new Set<number>()

  private console: Console;

  constructor(
    console: Console,
    stateRepository: PluginStateRepository<SFTPPluginConfig>,
    eventRepository: MageEventRepository,
    observationRepository: ObservationRepositoryForEvent,
    userRepository: UserRepository,
    attachmentStore: AttachmentStore,
    dbConnection: Connection
  ) {
    const sftpObservationModel = SftpObservationModel(dbConnection, `${packageName}/observations`)
    const sftpObservationRepository = new MongooseSftpObservationRepository(sftpObservationModel)
    const archiverFactory = new ArchiverFactory(userRepository, attachmentStore)

    this.stateRepository = stateRepository;
    this.eventRepository = eventRepository;
    this.sftpObservationRepository = sftpObservationRepository;
    this.observationRepository = observationRepository;
    this.archiveFactory = archiverFactory
    this.console = console;
  }

  public async getConfiguration(): Promise<SFTPPluginConfig> {
    let config: SFTPPluginConfig = this.configuration
      ?? await this.stateRepository.get()
      ?? await this.stateRepository.put(defaultSFTPPluginConfig);
    return { ...config, hasPrivateKey: this.privateKeyFileExists() }
  }

  public async updateConfiguration(configuration: SFTPPluginConfig) {
    try {
      await this.stateRepository.put(configuration)
    } catch (err) {
      this.console.log(`ERROR: updateConfiguration: ${err}`)
    }
  }

  private getSftpKeyFilePath(): string {
    const keyFile = process.env['MAGE_SFTP_KEY_FILE'] as string
    if (!keyFile) {
      throw new Error('MAGE_SFTP_KEY_FILE environment variable is not set. Configure sftpKeyFile in the server config.')
    }
    return keyFile
  }

  private privateKeyFileExists(): boolean {
    try {
      const keyFile = this.getSftpKeyFilePath()
      return fs.existsSync(keyFile)
    } catch {
      return false
    }
  }

  public savePrivateKey(keyText: string): void {
    const keyFile = this.getSftpKeyFilePath()
    const keyDir = path.dirname(keyFile)
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true })
    }
    fs.writeFileSync(keyFile, keyText, { mode: 0o600 })
  }

  public removePrivateKey(): void {
    const keyFile = this.getSftpKeyFilePath()
    if (fs.existsSync(keyFile)) {
      fs.unlinkSync(keyFile)
    }
  }

  public async resetToDefaults(): Promise<void> {
    await this.stop()
    this.removePrivateKey()
    await this.stateRepository.put(defaultSFTPPluginConfig)
    this.configuration = null
  }

  private resolvePrivateKey(): Buffer {
    const keyFile = this.getSftpKeyFilePath()
    if (!fs.existsSync(keyFile)) {
      throw new Error('No SFTP private key file found. Upload a key in the admin settings or place one at the configured path.')
    }
    return fs.readFileSync(keyFile)
  }

  async start() {
    this.configuration = await this.getConfiguration()
    if (!this.configuration.enabled) {
      return
    }

    this.isRunning = true;
    await this.processAndScheduleNext()
  }

  async stop() {
    this.configuration = null
    this.isRunning = false
    clearTimeout(this.nextTimeout)
  }

  public async getActiveEvents(): Promise<{ id: number; name: string }[]> {
    try {
      const events = await this.eventRepository.findActiveEvents()
      return events.map(e => ({ id: e.id, name: e.name }))
    } catch (e) {
      this.console.error('Error fetching active events:', e)
      return []
    }
  }

  /**
   * Returns all SFTP sync records for an event, with total counts per status.
   */
  public async getObservationStatuses(eventId: number, statusFilter?: SftpStatus[]): Promise<{ records: SftpAttrs[], counts: Record<string, number> }> {
    const records = statusFilter?.length
      ? await this.sftpObservationRepository.findAllByStatus(eventId, statusFilter)
      : await this.sftpObservationRepository.findAll(eventId)
    const everything = statusFilter?.length
      ? await this.sftpObservationRepository.findAll(eventId)
      : records
    const counts: Record<string, number> = { SUCCESS: 0, FAILED: 0, PENDING: 0, SKIPPED: 0 }
    for (const r of everything) counts[r.status] = (counts[r.status] ?? 0) + 1
    return { records, counts }
  }

  /**
   * Returns sync status counts per event, so problem events can be spotted without
   * loading each event's full record list. A PENDING record is considered "stuck" once
   * it has sat unresolved longer than the configured attachment-wait timeout
   * (initiation.timeout) — the same window sftpObservation() uses to keep retrying an
   * incomplete archive before giving up.
   */
  public async getObservationStatusSummary(): Promise<(SftpObservationEventSummary & { eventName: string })[]> {
    const configuration = await this.getConfiguration()
    const events = getEventsToSync(await this.eventRepository.findActiveEvents(), configuration)

    const timeoutMs = configuration.initiation.timeout * 60 * 1000
    const stalePendingBefore = new Date(Date.now() - timeoutMs)
    const summaries = await this.sftpObservationRepository.getSummaryByEvent(stalePendingBefore)
    const summaryByEventId = new Map(summaries.map(s => [s.eventId, s]))

    return events.map(mageEvent => {
      const summary = summaryByEventId.get(mageEvent.id)
      return {
        eventId: mageEvent.id,
        eventName: mageEvent.name,
        counts: summary?.counts ?? { SUCCESS: 0, FAILED: 0, PENDING: 0, SKIPPED: 0 },
        stuckPendingCount: summary?.stuckPendingCount ?? 0
      }
    })
  }

  /**
   * Requeues observations as PENDING so the next poll cycle retries them.
   */
  public async requeueObservations(eventId: number, observationIds: string[]): Promise<void> {
    for (const id of observationIds) {
      await this.sftpObservationRepository.postStatus(eventId, id, SftpStatus.PENDING)
    }
  }

  public async testConnection(config?: Partial<SFTPPluginConfig>): Promise<ConnectionTestResult> {
    const testClient = new SFTPClient()
    const timestamp = new Date()

    try {
      let privateKey: Buffer
      try {
        privateKey = this.resolvePrivateKey()
      } catch (e) {
        return {
          success: false,
          message: e instanceof Error ? e.message : 'No SFTP private key configured',
          timestamp
        }
      }

      const currentConfig = this.configuration || await this.getConfiguration()
      const sftpConfig = config?.sftpClient || currentConfig.sftpClient

      if (!sftpConfig.host) {
        return {
          success: false,
          message: 'SFTP host is not configured',
          timestamp
        }
      }

      await testClient.connect({
        host: sftpConfig.host,
        port: sftpConfig.port || 22,
        username: sftpConfig.username,
        privateKey: privateKey
      })

      try {
        await testClient.list(sftpConfig.path || '/')
      } catch (pathError) {
        await testClient.end()
        return {
          success: false,
          message: `Connected to SFTP server, but cannot access path "${sftpConfig.path}": ${pathError instanceof Error ? pathError.message : String(pathError)}`,
          timestamp
        }
      }

      await testClient.end()

      return {
        success: true,
        message: `Connected to ${sftpConfig.host}:${sftpConfig.port} with access to "${sftpConfig.path}"`,
        timestamp
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.console.error('Connection test failed:', e)

      return {
        success: false,
        message: errorMessage,
        timestamp
      }
    } finally {
      try {
        await testClient.end()
      } catch {
      }
    }
  }

  private async processAndScheduleNext() {
    const configuration = await this.getConfiguration();
    if (this.isRunning) {
      const events = getEventsToSync(await this.eventRepository.findActiveEvents(), configuration)

      const eventObservations = new Map<number, Observation[]>()
      let hasObservationsToSync = false
      for (const attrs of events) {
        const event = new MageEvent(attrs)
        const observations = await this.gatherObservationsToSync(event, configuration)
        if (observations.length) hasObservationsToSync = true
        eventObservations.set(event.id, observations)
      }

      if (hasObservationsToSync) {
        const client = new SFTPClient()
        let connected = false
        try {
          const privateKey = this.resolvePrivateKey()
          await client.connect({
            host: configuration.sftpClient.host,
            port: configuration.sftpClient.port,
            username: configuration.sftpClient.username,
            privateKey: privateKey
          })
          connected = true
        } catch (e) {
          this.console.error('SFTP connection failed, will retry on next interval', e)
        }

        if (connected) {
          try {
            for (const attrs of events) {
              const event = new MageEvent(attrs)
              await this.processEvent(event, configuration, eventObservations.get(event.id) ?? [], client)
            }
          } catch (e) {
            this.console.error('sftp error', e)
          } finally {
            try { await client.end() } catch { }
          }
        }
      }

      this.scheduleNext(configuration.interval);
    }
  }

  private scheduleNext(interval: number) {
    if (this.isRunning) {
      this.nextTimeout = setTimeout(() => { this.processAndScheduleNext() }, interval * 1000);
    }
  }

  private async gatherObservationsToSync(event: MageEvent, configuration: SFTPPluginConfig): Promise<Observation[]> {
    const observationRepository = await this.observationRepository(event.id);

    await this.skipMissedObservations(event, observationRepository)

    const result: Observation[] = []

    this.console.debug('fetching pending observations for event ' + event.name);
    const pending = await this.sftpObservationRepository.findAllByStatus(event.id, [SftpStatus.PENDING])
    for (const sftpAttrs of pending) {
      const observation = await observationRepository.findById(sftpAttrs.observationId)
      if (observation !== null) {
        result.push(observation)
      }
    }

    const latestSyncedTime = await this.sftpObservationRepository.findLatestSyncedObservationTime(event.id)
    let queryTime: number = Math.max(latestSyncedTime?.getTime() ?? 0, this.pluginStartTime)

    const page: PagingParameters = {
      pageSize: configuration.pageSize,
      pageIndex: 0
    }

    this.console.debug('fetching observations modified after ' + new Date(queryTime).toISOString() + ' for event ' + event.name);
    let { items: observations } = await observationRepository.findLastModifiedAfter(queryTime, page);
    observations = await this.filterObservationsToSync(event, observations, configuration.initiation.rule)
    for (const observationAttrs of observations) {
      result.push(Observation.evaluate(observationAttrs, event))
    }

    return result
  }

  private async processEvent(event: MageEvent, configuration: SFTPPluginConfig, observations: Observation[], client: SFTPClient) {
    if (!observations.length) {
      this.console.debug('no new or updated observations for event ' + event.name)
      return
    }
    for (const observation of observations) {
      await this.sftpObservation(observation, event, configuration.archiveFormat, configuration.sftpClient.path, configuration.initiation.timeout, client)
    }
  }

  /**
   * Filters observations to determine which ones actually need syncing.
   * - Create rule: only sync observations that have never been successfully synced.
   * - CreateAndUpdate rule: sync observations that are either new or have been
   *   modified since their last successful sync (lastModified > stored lastObservationModified).
   */
  private async filterObservationsToSync(event: MageEvent, observations: ObservationAttrs[], rule: TriggerRule): Promise<ObservationAttrs[]> {
    const filtered: ObservationAttrs[] = []
    for (const observation of observations) {
      if (rule === TriggerRule.Create) {
        const isProcessed = await this.sftpObservationRepository.isProcessed(event.id, observation.id)
        if (!isProcessed) {
          filtered.push(observation)
        }
      } else {
        const isSynced = await this.sftpObservationRepository.isSyncedAtLastModified(event.id, observation.id, observation.lastModified)
        if (!isSynced) {
          filtered.push(observation)
        }
      }
    }
    return filtered
  }

  // Checks for any observation that predates the plugin start with no sftp record and marks them as 'SKIPPED'
  private async skipMissedObservations(event: MageEvent, observationRepository: EventScopedObservationRepository): Promise<void> {
    if (this.startupSkipDone.has(event.id)) return
    this.startupSkipDone.add(event.id)

    const existing = await this.sftpObservationRepository.findAll(event.id)
    const knownIds = new Set(existing.map(r => r.observationId))

    const skippedIds: string[] = []
    const page: PagingParameters = { pageSize: 500, pageIndex: 0 }

    while (true) {
      const { items } = await observationRepository.findLastModifiedAfter(0, page)
      if (!items.length) break
      for (const obs of items) {
        if (obs.lastModified.getTime() < this.pluginStartTime && !knownIds.has(obs.id)) {
          skippedIds.push(obs.id)
        }
      }
      if (items.length < page.pageSize) break
      page.pageIndex++
    }

    if (skippedIds.length) {
      await this.sftpObservationRepository.markManySkipped(event.id, skippedIds)
      this.console.info(`Marked ${skippedIds.length} pre-existing observations as SKIPPED for event ${event.name}`)
    }
  }

  private async sftpObservation(
    observation: Observation,
    event: MageEvent,
    format: ArchiveFormat,
    sftpPath: string,
    timeoutMinutes: number,
    client: SFTPClient
  ) {
    const archiver = this.archiveFactory.createArchiver(format)
    const result = await archiver.createArchive(observation, event)
    const timeoutMs = timeoutMinutes * 60 * 1000

    if (result instanceof ArchiveResult) {
      if (result.status === ArchiveStatus.Complete || (result.status === ArchiveStatus.Incomplete && (observation.lastModified.getTime() + timeoutMs) > Date.now())) {
        try {
          const filename = (`${observation.id}`)

          const stream = new PassThrough()
          result.archive.pipe(stream)

          const uploadPromise = client.put(stream, `${sftpPath}/${filename}.zip`)
          const finalizePromise = result.archive.finalize()

          await Promise.all([uploadPromise, finalizePromise])

          await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.SUCCESS, observation.lastModified)
        } catch (error) {
          this.console.error(`error uploading observation ${observation.id}`, error)
          await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.FAILED)
        }
      } else {
        this.console.info(`pending observation ${observation.id}`)
        await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.PENDING)
      }
    } else {
      this.console.info(`error observation ${observation.id}`, result)
      await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.FAILED)
    }
  }

}