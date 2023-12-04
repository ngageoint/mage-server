import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEvent, MageEventId, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { AttachmentStore, Observation, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users';
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';
import SFTPClient from 'ssh2-sftp-client';
import { PassThrough } from 'stream';
import { SFTPPluginConfig, defaultSFTPPluginConfig } from './SFTPPluginConfig';
import { ArchiveFormat, ArchiverFactory } from './format/format';

/**
 * Class that wakes up at a certain configured interval and processes any new observations that can be
 * sent to any specified ArcGIS feature layers.
 */
export class ObservationProcessor {

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
   * Used to get user information.
   */
  private userRepository: UserRepository;

  /**
 * Used to get user information.
 */
  private attachmentStore: AttachmentStore;

  /**
   * Used to log to the console.
   */
  private console: Console;

  /**
   * Contains the different feature layers to send observations too.
   */
  private stateRepository: PluginStateRepository<SFTPPluginConfig>;

  private sftpClient: SFTPClient

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
    userRepository: UserRepository,
    attachmentStore: AttachmentStore,
    console: Console
  ) {
    this.stateRepository = stateRepository;
    this.eventRepository = eventRepository;
    this.observationRepository = observationRepository;
    this.userRepository = userRepository;
    this.attachmentStore = attachmentStore
    this.console = console;
    this.sftpClient = new SFTPClient()
  }

  /**
   * Gets the current configuration from the database.
   * @returns The current configuration from the database.
   */
  public async getConfiguration(): Promise<SFTPPluginConfig> {
    return await this.stateRepository.get().then(x => !!x ? x : this.stateRepository.put(defaultSFTPPluginConfig))
  }

  /**
   * Updates new configuration in the state repository.
   * @param configuration The new config to put into the state repo.
   */
  public updateConfiguration(configuration: SFTPPluginConfig) {
    this.stateRepository.put(configuration);
  }

  /**
   * Starts the processor.
   */
  async start() {
    const configuration = await this.getConfiguration()
    try {
      await this.sftpClient.connect(configuration.sftpConfiguration)
    } catch (e) {
      this.console.error("ERROR, could not connect to SFTP endpoint")
    }

    this.isRunning = true;
    this.processAndScheduleNext();
  }

  /**
   * Stops the processor.
   */
  stop() {
    this.isRunning = false;
    clearTimeout(this.nextTimeout);
  }

  /**
   * Processes any new observations and then schedules its next run if it hasn't been stopped.
   */
  private async processAndScheduleNext() {
    const configuration = await this.getConfiguration();
    if (this.isRunning) {
      try {
        this.console.info('Processing new observations...');
        const events = await this.eventRepository.findActiveEvents();

        for (const attrs of events) {
          const event = new MageEvent(attrs)
          await this.processEvent(event, configuration)
        }
      } catch (e) {
        this.console.error('SFTP error:', e)
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
    const timestamp = configuration.sync?.[event.id] || 0

    const page: PagingParameters = {
      pageSize: configuration.pageSize,
      pageIndex: 0
    }

    this.console.info('Getting newest observations for event ' + event.name);
    const observationRepository = await this.observationRepository(event.id);
    let { items: observations } = await observationRepository.findLastModifiedAfter(timestamp + 1, page);

    if (observations.length) {
      for (const attrs of observations) {
        const observation = Observation.evaluate(attrs, event)
        await this.processObservation(observation, event, configuration.archiveFormat)
      }

      page.pageIndex = ++page.pageIndex
    } else {
      this.console.info('No new observations to SFTP')
    }
  }

  private async processObservation(observation: Observation, event: MageEvent, format: ArchiveFormat) {
    this.console.info('SFTP observation', observation.id)

    const archiver = new ArchiverFactory(format, this.userRepository, this.attachmentStore).createArchiver()
    const archive = await archiver.createArchive(observation, event)

    const stream = new PassThrough();
    archive.pipe(stream)
    await archive.finalize()
    await this.sftpClient.put(stream, `/Users/wnewman/sftp/${observation.id}.zip`);

    const sync: { [key: MageEventId]: number } = {
      [observation.eventId]: observation.lastModified.getTime()
    };
    const config: Partial<SFTPPluginConfig> = { sync }
    this.stateRepository.patch(config)
  }
}