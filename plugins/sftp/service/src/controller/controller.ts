import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEvent, MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { AttachmentStore, Observation, ObservationAttrs, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { UserRepository } from "@ngageoint/mage.service/lib/entities/users/entities.users";
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api';
import SFTPClient from 'ssh2-sftp-client';
import { PassThrough } from 'stream';
import { SFTPPluginConfig, defaultSFTPPluginConfig } from '../configuration/SFTPPluginConfig';
import { ArchiveFormat, ArchiveStatus, ArchiverFactory, ArchiveResult, TriggerRule } from '../format/entities.format';
import fs from 'fs';
import { SftpAttrs, SftpObservationRepository, SftpStatus, MongooseSftpObservationRepository, SftpObservationModel } from '../adapters/adapters.sftp.mongoose';
import { MongooseTeamsRepository } from '../adapters/adapters.sftp.teams';
import { Connection } from 'mongoose';
import { error } from 'console';

const { name: packageName } = require('../../package.json')

/**
 * Represents the result of a connection test
 */
export interface ConnectionTestResult {
  success: boolean
  message: string
  timestamp?: Date
}

/**
 * Represents the current status of the plugin
 */
export interface PluginStatus {
  connected: boolean
  lastError?: string
  lastSync?: Date
  lastConnectionAttempt?: Date
}

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
   * Plugin status tracking
   */
  private status: PluginStatus = {
    connected: false,
    lastError: undefined,
    lastSync: undefined,
    lastConnectionAttempt: undefined
  };

  /**
   * Used to get all the active events.
   */
  private eventRepository: MageEventRepository;

  /**
   * Used to get team information for observations.
   */
  private teamRepository: MongooseTeamsRepository;

  /**
   * Used to get user information for observations.
   */
  private userRepository: UserRepository;

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
  private sftpClient: SFTPClient = new SFTPClient();

  /**
   * SFTP plugin configuration
   */
  private configuration: SFTPPluginConfig | null = null;

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
    console: Console,
    {
      stateRepository,
      eventRepository,
      observationRepository,
      userRepository,
      attachmentStore
    }: {
      stateRepository: PluginStateRepository<SFTPPluginConfig>;
      eventRepository: MageEventRepository;
      observationRepository: ObservationRepositoryForEvent;
      userRepository: UserRepository;
      attachmentStore: AttachmentStore;
    },
    dbConnection: Connection
  ) {
    const sftpObservationModel = SftpObservationModel(dbConnection, `${packageName}/observations`)
    const sftpObservationRepository = new MongooseSftpObservationRepository(sftpObservationModel)
    const teamRepo = new MongooseTeamsRepository(dbConnection)
    const archiverFactory = new ArchiverFactory(userRepository, attachmentStore)

    this.stateRepository = stateRepository;
    this.eventRepository = eventRepository;
    this.sftpObservationRepository = sftpObservationRepository;
    this.observationRepository = observationRepository;
    this.archiveFactory = archiverFactory
    this.console = console;
    this.teamRepository = teamRepo;
    this.userRepository = userRepository;
  }

  /**
   * Gets the current configuration from the database.
   * @returns The current configuration from the database.
   */
  public async getConfiguration(): Promise<SFTPPluginConfig> {
    if (this.configuration === null) {
      return await this.stateRepository.get().then((x: SFTPPluginConfig | null) => !!x ? x : this.stateRepository.put(defaultSFTPPluginConfig))
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
      await this.stateRepository.put(configuration)
    } catch (err) {
      this.console.log(`ERROR: updateConfiguration: ${err}`)
    }
  }

  /**
   * Starts the processor.
   */
  async start() {
    this.configuration = await this.getConfiguration()
    if (!this.configuration.enabled) {
      this.status.connected = false
      this.status.lastError = undefined
      return
    }

    this.status.lastConnectionAttempt = new Date()

    try {
      const sftpKeyFilename = process.env['MAGE_SFTP_KEY_FILE'] as string;
      if (!sftpKeyFilename) {
        throw new Error('MAGE_SFTP_KEY_FILE environment variable is not set')
      }
      const sftpKeyFile = fs.readFileSync(sftpKeyFilename);
      await this.sftpClient.connect({
        host: this.configuration.sftpClient.host,
        port: this.configuration.sftpClient.port,
        username: this.configuration.sftpClient.username,
        privateKey: sftpKeyFile
      });
      this.isRunning = true;
      this.status.connected = true;
      this.status.lastError = undefined;
      await this.processAndScheduleNext()
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.console.error("error connecting to sftp endpoint", e)
      this.status.connected = false
      this.status.lastError = `Connection failed: ${errorMessage}`
    }
  }

  /**
   * Stops the processor.
   */
  async stop() {
    this.configuration = null
    this.isRunning = false
    this.status.connected = false
    try {
      await this.sftpClient.end()
    } catch (e) {
      this.console.error("error disconnecting sftp client", e)
    }
    clearTimeout(this.nextTimeout)
  }

  /**
   * Gets the current plugin status
   * @returns The current status including connection state and any errors
   */
  public getStatus(): PluginStatus {
    return { ...this.status }
  }

  /**
   * Tests the connection to an SFTP server with the given configuration
   * @param config The SFTP client configuration to test
   * @returns A result object indicating success or failure with a message
   */
  public async testConnection(config?: Partial<SFTPPluginConfig>): Promise<ConnectionTestResult> {
    const testClient = new SFTPClient()
    const timestamp = new Date()

    try {
      const sftpKeyFilename = process.env['MAGE_SFTP_KEY_FILE'] as string
      if (!sftpKeyFilename) {
        return {
          success: false,
          message: 'MAGE_SFTP_KEY_FILE environment variable is not set. Please configure the server with a valid SFTP private key file path.',
          timestamp
        }
      }

      let sftpKeyFile: Buffer
      try {
        sftpKeyFile = fs.readFileSync(sftpKeyFilename)
      } catch (e) {
        return {
          success: false,
          message: `Failed to read SFTP key file at "${sftpKeyFilename}": ${e instanceof Error ? e.message : String(e)}`,
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
        privateKey: sftpKeyFile
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
        message: `Successfully connected to ${sftpConfig.host}:${sftpConfig.port} and verified access to path "${sftpConfig.path}"`,
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
        this.status.lastSync = new Date()
        this.status.lastError = undefined
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        this.console.error('sftp error', e)
        this.status.lastError = `Sync error: ${errorMessage}`
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
        try {
          const teams = await this.teamRepository.findTeamsByUserId(observation.userId);
          // Filter out events from the teams response (bug) and teams that are not in the event
          const newTeams = teams.filter((team) => team.teamEventId == null && event.teamIds?.map((teamId) => teamId.toString()).includes(team._id.toString()))
          const teamNames = newTeams.length > 0 ? `${newTeams.map(team => team.name).join('_')}_` : '';
          const user = await this.userRepository.findById(observation.userId || '')
          const filename = (`${event.name}_${teamNames}${user?.username || observation.userId}_${observation.id}`)

          const stream = new PassThrough()
          result.archive.pipe(stream)

          const uploadPromise = this.sftpClient.put(stream, `${sftpPath}/${filename}.zip`)
          const finalizePromise = result.archive.finalize()

          await Promise.all([uploadPromise, finalizePromise])

          await this.sftpObservationRepository.postStatus(event.id, observation.id, SftpStatus.SUCCESS)
        } catch (error) {
          this.console.error(`error uploading observation ${observation.id}`, error)
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