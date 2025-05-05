import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEvent, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { Observation, ObservationAttrs, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';
import SFTPClient from 'ssh2-sftp-client';
import { PassThrough } from 'stream';
import { SFTPPluginConfig, defaultSFTPPluginConfig, encryptDecrypt } from '../configuration/SFTPPluginConfig';
import { ArchiveFormat, ArchiveStatus, ArchiverFactory, ArchiveResult, TriggerRule } from '../format/entities.format';
import { SftpAttrs, SftpObservationRepository, SftpStatus } from '../adapters/adapters.sftp.mongoose';

/**
 * Class used to process observations for SFTP
 */
export class SftpController {

  /**
   * True if the processor is currently active, false otherwise.
   */
  private isRunning = false;

  /**
   * The next timeout, use this to cancel the next one if the processor is stopped.
   */
  private nextTimeout: NodeJS.Timeout | undefined;

  /**
   * Used to get all the active events.
   */
  private eventRepository: MageEventRepository;

  /**
   * Used to get new observations.
   */
  private observationRepository: ObservationRepositoryForEvent;

  /**
  * Used to save sftp status for each observation
  */
  private sftpObservationRepository: SftpObservationRepository

  /**
   * SFTP plugin state configuration
   */
  private stateRepository: PluginStateRepository<SFTPPluginConfig>;

  /**
   * SFTP client configuration
   */
  private sftpClient: SFTPClient

  /**
   * SFTP plugin configuration
   */
  private configuration: SFTPPluginConfig | null

  /**
   * Factory to retrieve archiver based on plugin configuration
   */
  archiveFactory: ArchiverFactory

  /**
   * Console logger
   */
  private console: Console;

  /**
   * Constructor.
   * @param stateRepository The plugins configuration.
   * @param eventRepository Used to get all the active events.
   * @param observationRepository Used to get new observations.
   * @param userRepository Used to get user information.
   * @param console Used to log to the console.
   */
  constructor(
    stateRepository: PluginStateRepository<SFTPPluginConfig>,
    eventRepository: MageEventRepository,
    observationRepository: ObservationRepositoryForEvent,
    sftpObservationRepository: SftpObservationRepository,
    sftpClient: SFTPClient,
    archiverFactory: ArchiverFactory,
    console: Console
  ) {
    this.stateRepository = stateRepository;
    this.eventRepository = eventRepository;
    this.sftpObservationRepository = sftpObservationRepository;
    this.observationRepository = observationRepository;
    this.sftpClient = sftpClient
    this.archiveFactory = archiverFactory
    this.configuration = null
    this.console = console;
  }

  /**
   * Gets the current configuration from the database.
   * @returns The current configuration from the database.
   */
  public async getConfiguration(): Promise<SFTPPluginConfig> {
    if (this.configuration === null) {
      return await this.stateRepository.get().then((x: SFTPPluginConfig | null) => !!x ? encryptDecrypt(x, false) : this.stateRepository.put(defaultSFTPPluginConfig))
    } else {
      return this.configuration
    }
  }

  /**
   * Updates new configuration in the state repository.
   * @param configuration The new config to put into the state repo.
   */
  public async updateConfiguration(configuration: SFTPPluginConfig) {
    try {
      let config = await encryptDecrypt(configuration, true);
      await this.stateRepository.put(config)
    } catch (err) {
      this.console.log(`ERROR: updateConfiguration: ${err}`)
    }
  }

  /**
   * Starts the processor.
   */
  async start() {
    this.configuration = await this.getConfiguration()
    if (!this.configuration.enabled) { return }

    try {
      await this.sftpClient.connect(this.configuration.sftpClient)
    } catch (e) {
      this.console.error("error connecting to sftp endpoint", e)
    }

    this.isRunning = true;
    await this.processAndScheduleNext()
  }

  /**
   * Stops the processor.
   */
  async stop() {
    this.configuration = null
    this.isRunning = false
    await this.sftpClient.end()
    clearTimeout(this.nextTimeout)
  }

  /**
   * Processes any new observations and then schedules its next run if it hasn't been stopped.
   */
  private async processAndScheduleNext() {
    const configuration = await this.getConfiguration();
    if (this.isRunning) {
      try {
        this.console.info('processing new observations');
        const events = await this.eventRepository.findActiveEvents();

        for (const attrs of events) {
          const event = new MageEvent(attrs)
          await this.processEvent(event, configuration)
        }
      } catch (e) {
        this.console.error('sftp error', e)
      }

      this.scheduleNext(configuration.interval);
    }
  }

  /**
   * Schedule next run.
   * @param interval interval in seconds in which to schedule the next run from now
   */
  private scheduleNext(interval: number) {
    if (this.isRunning) {
      this.nextTimeout = setTimeout(() => { this.processAndScheduleNext() }, interval * 1000);
    }
  }

  private async processEvent(event: MageEvent, configuration: SFTPPluginConfig) {
    const observationRepository = await this.observationRepository(event.id);

    this.console.debug('fetching pending observations for event ' + event.name);
    const pending = await this.sftpObservationRepository.findAllByStatus(event.id, [SftpStatus.PENDING])
    for (const sftpAttrs of pending) {
      const observation = await observationRepository.findById(sftpAttrs.observationId)
      if (observation !== null) {
        await this.sftpObservation(observation, event, configuration.archiveFormat, configuration.sftpClient.path, configuration.initiation.timeout)
      }
    }

    const latest: SftpAttrs | null = await this.sftpObservationRepository.findLatest(event.id)
    let queryTime: number = 0
    if (latest !== null) {
      const observation = await observationRepository.findById(latest.observationId)
      if (observation !== null) {
        queryTime = observation.lastModified.getTime() + 1
      }
    }

    const page: PagingParameters = {
      pageSize: configuration.pageSize,
      pageIndex: 0
    }

    this.console.debug('fetching new observations for event ' + event.name);
    let { items: observations } = await observationRepository.findLastModifiedAfter(queryTime, page);
    observations = await this.applyTriggerRule(event, observations, configuration.initiation.rule)

    if (observations.length) {
      for (const observationAttrs of observations) {
        const observation = Observation.evaluate(observationAttrs, event)
        await this.sftpObservation(observation, event, configuration.archiveFormat, configuration.sftpClient.path, configuration.initiation.timeout)
      }

      page.pageIndex = ++page.pageIndex
    } else {
      this.console.debug('no new observations')
    }
  }

  private async applyTriggerRule(event: MageEvent, observations: ObservationAttrs[], rule: TriggerRule): Promise<ObservationAttrs[]> {
    if (rule === TriggerRule.Create) {
      const filtered: ObservationAttrs[] = []
      for (const observation of observations) {
        const isProcessed = await this.sftpObservationRepository.isProcessed(event.id, observation.id)
        if (!isProcessed) {
          filtered.push(observation)
        }
      }

      return filtered
    } else {
      return observations
    }
  }

  private async sftpObservation(
    observation: Observation,
    event: MageEvent,
    format: ArchiveFormat,
    sftpPath: string,
    timeout: number
  ) {
    const archiver = this.archiveFactory.createArchiver(format)
    const result = await archiver.createArchive(observation, event)

    if (result instanceof ArchiveResult) {
      if (result.status === ArchiveStatus.Complete || (result.status === ArchiveStatus.Incomplete && (observation.lastModified.getTime() + timeout) > Date.now())) {
        this.console.log(`posting status of success`)
        const stream = new PassThrough()
        result.archive.pipe(stream)
        await result.archive.finalize()
        await this.sftpClient.put(stream, `${sftpPath}/${observation.id}.zip`)
        await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.SUCCESS)
      } else {
        this.console.log(`posting status of pending`)

        this.console.info(`pending observation ${observation.id}`)
        await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.PENDING)
      }
    } else {
      this.console.info(`error observation ${observation.id}`, result)
      await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.FAILED)
    }
  }
}