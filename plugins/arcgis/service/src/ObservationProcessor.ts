import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEventId } from "@ngageoint/mage.service/lib/entities/events/entities.events";
import { MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { EventScopedObservationRepository, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from './types/ArcGISPluginConfig';
import { ObservationsTransformer } from './ObservationsTransformer'
import { ArcObjects } from './ArcObjects'
import { FeatureService } from './FeatureService';
import { LayerInfo } from './LayerInfo';
import { LayerInfoResult } from "./types/LayerInfoResult";
import { FeatureLayerProcessor } from './FeatureLayerProcessor';
import { EventTransform } from './EventTransform';
import { GeometryChangedHandler } from './GeometryChangedHandler';
import { EventDeletionHandler } from './EventDeletionHandler';
import { EventLayerProcessorOrganizer } from './EventLayerProcessorOrganizer';
import { FeatureServiceConfig } from "./types/ArcGISConfig"
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { FeatureServiceAdmin } from './FeatureServiceAdmin';
import { ArcGISIdentityService } from './ArcGISService';

/**
 * Class that wakes up at a certain configured interval and processes any new observations that can be
 * sent to any specified ArcGIS feature layers.
 */
export class ObservationProcessor {

	/**
	 * True if the processor is currently active, false otherwise.
	 */
	private _isRunning: boolean = false;

	/**
	 * The next timeout, use this to cancel the next one if the processor is stopped.
	 */
	private _nextTimeout: NodeJS.Timeout | undefined;

	/**
	 * Used to get all the active events.
	 */
	private _eventRepo: MageEventRepository;

	/**
	 * Used to get new observations.
	 */
	private _obsRepos: ObservationRepositoryForEvent;

	/**
	 * Used to get user information.
	 */
	private _userRepo: UserRepository;

	/**
	 * Used to manager ArcGIS user identities
	 */
	private _identityService: ArcGISIdentityService;

	/**
	 * Used to log to the console.
	 */
	private _console: Console;

	/**
	 * Used to convert observations to json string that can be sent to an arcgis server.
	 */
	private _transformer: ObservationsTransformer;

	/**
	 * Contains the different feature layers to send observations too.
	 */
	private _stateRepo: PluginStateRepository<ArcGISPluginConfig>;

	/**
	 * The previous plugins configuration JSON.
	 */
	private _previousConfig?: string;

	/**
	 * Sends observations to a single feature layer.
	 */
	private _layerProcessors: FeatureLayerProcessor[] = [];

	/**
	 * True if this is a first run at updating arc feature layers.  If so we need to make sure the layers are
	 * all up to date.
	 */
	private _firstRun: boolean = true;

	/**
	 * Handles removing observation from previous layers when an observation geometry changes.
	 */
	private _geometryChangeHandler: GeometryChangedHandler;

	/**
	 * Handles removing observations when an event is deleted.
	 */
	private _eventDeletionHandler: EventDeletionHandler;

	/**
	 * Maps the events to the processor they are synching data for.
	 */
	private _organizer: EventLayerProcessorOrganizer;

	/**
	 * Constructor.
	 * @param {PluginStateRepository<ArcGISPluginConfig>} stateRepo The plugins configuration.
	 * @param {MageEventRepository} eventRepo Used to get all the active events.
	 * @param {ObservationRepositoryForEvent} obsRepos Used to get new observations.
	 * @param {UserRepository} userRepo Used to get user information.
	 * @param {ArcGISIdentityService} identityService Used to manager ArcGIS user identities.
	 * @param {Console} console Used to log to the console.
	 */
	constructor(
		stateRepo: PluginStateRepository<ArcGISPluginConfig>,
		eventRepo: MageEventRepository,
		obsRepos: ObservationRepositoryForEvent,
		userRepo: UserRepository,
		identityService: ArcGISIdentityService,
		console: Console
	) {
		this._stateRepo = stateRepo;
		this._eventRepo = eventRepo;
		this._obsRepos = obsRepos;
		this._userRepo = userRepo;
		this._identityService = identityService;
		this._console = console;
		this._organizer = new EventLayerProcessorOrganizer();
		this._transformer = new ObservationsTransformer(defaultArcGISPluginConfig, console);
		this._geometryChangeHandler = new GeometryChangedHandler(this._transformer);
		this._eventDeletionHandler = new EventDeletionHandler(this._console, defaultArcGISPluginConfig);
	}

	/**
	 * Gets the current configuration from the database.
	 * @returns {Promise<ArcGISPluginConfig>} The current configuration from the database.
	 */
	public async safeGetConfig(): Promise<ArcGISPluginConfig> {
		const state = await this._stateRepo.get();
		if (!state) return await this._stateRepo.put(defaultArcGISPluginConfig as never);
		return await this._stateRepo.get().then((state) => state ? state : this._stateRepo.put(defaultArcGISPluginConfig as never));
	}

	/**
	 * Puts a new confguration in the state repo.
	 * @param {ArcGISPluginConfig} newConfig The new config to put into the state repo.
	 * @returns {Promise<ArcGISPluginConfig>} The updated configuration.
	 */
	public async putConfig(newConfig: ArcGISPluginConfig): Promise<ArcGISPluginConfig> {
		return await this._stateRepo.put(newConfig as never);
	}

	/**
	 * Updates the confguration in the state repo.
	 * @param {ArcGISPluginConfig} newConfig The new config to put into the state repo.
	 * @returns {Promise<ArcGISPluginConfig>} The updated configuration.
	 */
	public async patchConfig(newConfig: ArcGISPluginConfig): Promise<ArcGISPluginConfig> {
		return await this._stateRepo.patch(newConfig as never);
	}

	/**
	 * Gets the current configuration and updates the processor if needed
	 * @returns {Promise<ArcGISPluginConfig>} The current configuration from the database.
	 */
	private async updateConfig(): Promise<ArcGISPluginConfig> {
		const config = await this.safeGetConfig();

		if (!config.enabled) {
			this._console.info('ArcGIS plugin is disabled, stopping processor');
			this.stop();
			return config;
		}

		// Include configured eventform definitions while detecting changes in config
		const eventIds = config.featureServices
			.flatMap(service => service.layers)
			.flatMap(layer => layer.eventIds)
			.filter((eventId): eventId is MageEventId => typeof eventId === 'number');

		const eventForms = await this._eventRepo.findAllByIds(eventIds);
		const fullConfig = { ...config, eventForms };

		const configJson = JSON.stringify(fullConfig)
		if (this._previousConfig == null || this._previousConfig !== configJson) {
			this._transformer = new ObservationsTransformer(config, console);
			this._geometryChangeHandler = new GeometryChangedHandler(this._transformer);
			this._eventDeletionHandler.updateConfig(config);
			this._layerProcessors = [];
			this._previousConfig = configJson
			await this.getFeatureServiceLayers(config);
		}
		return config;
	}

	/**
	 * Starts the processor.
	 */
	async start() {
		this._isRunning = true;
		this._firstRun = true;
		await this.processAndScheduleNext();
	}

	/**
	 * Stops the processor.
	 */
	stop() {
		this._isRunning = false;
		clearTimeout(this._nextTimeout);
	}

	/**
	 * Gets information on all the configured features service layers.
	 * @param {ArcGISPluginConfig} config The plugins configuration.
	 * @returns {Promise<void>}
	 */
	private async getFeatureServiceLayers(config: ArcGISPluginConfig) {
		const promises = [];
		for (const service of config.featureServices) {
			try {
				promises.push(this.handleFeatureService(service, config))
			} catch (err) {
				console.error(err);
			}
		}
		await Promise.all(promises);
	}

	/**
	 * Called when information on a feature service is returned from an arc server.
	 * @param {FeatureServiceResult} featureService The feature service.
	 * @param {FeatureServiceConfig} featureServiceConfig The feature service config.
	 * @param {ArcGISPluginConfig} config The plugin configuration.
	 */
	private async handleFeatureService(featureServiceConfig: FeatureServiceConfig, config: ArcGISPluginConfig) {
		const identityManager = await this._identityService.signin(featureServiceConfig)
		const featureService = new FeatureService(console, featureServiceConfig, identityManager)
		const arcService = await featureService.getService();

		for (const featureLayer of arcService.layers) {
			const featureLayerConfig = featureServiceConfig.layers.find(layer => layer.layer.toString() === featureLayer.name.toString());
			if (featureLayerConfig) {
				const url = `${featureServiceConfig.url}/${featureLayer.id}`;
				const layerInfo = await featureService.getLayer(featureLayer.id);
				if (featureLayer.geometryType != null) {
					// TODO The featureLayerConfig should contain the layer id
					featureLayerConfig.layer = featureLayer.id;
					const admin = new FeatureServiceAdmin(config, this._identityService, this._console)
					const eventIds = featureLayerConfig.eventIds || []
					const layerFields = await admin.updateLayer(featureServiceConfig, featureLayerConfig, layerInfo, this._eventRepo)
					const info = new LayerInfo(url, eventIds, { ...layerInfo, fields: layerFields } as LayerInfoResult);
					const layerProcessor = new FeatureLayerProcessor(info, config, identityManager, this._console);
					this._layerProcessors.push(layerProcessor);
				}
			}
		}
	}

	/**
	 * Processes any new observations and then schedules its next run if it hasn't been stopped.
	 */
	private async processAndScheduleNext() {
		const config = await this.updateConfig();
		if (this._isRunning) {
			if (config.enabled && this._layerProcessors.length > 0) {
				this._console.info('ArcGIS plugin checking for any pending updates or adds');
				const pendingPromises = [];
				for (const layerProcessor of this._layerProcessors) {
					pendingPromises.push(layerProcessor.processPendingUpdates());
				}
				await Promise.all(pendingPromises);
				this._console.info('ArcGIS plugin processing new observations...');
				const enabledEvents = (await this._eventRepo.findActiveEvents()).filter(event =>
					this._layerProcessors.some(layerProcessor =>
						layerProcessor.layerInfo.hasEvent(event.id)
					)
				);
				this._eventDeletionHandler.checkForEventDeletion(enabledEvents, this._layerProcessors, this._firstRun);
				const eventsToProcessors = this._organizer.organize(enabledEvents, this._layerProcessors);
				const nextQueryTime = Date.now();
				const promises = [];
				for (const pair of eventsToProcessors) {
					promises.push(new Promise<void>(async (resolve, reject) => {
						this._console.info('ArcGIS getting newest observations for event ' + pair.event.name);
						const obsRepo = await this._obsRepos(pair.event.id);
						const pagingSettings = {
							pageSize: config.batchSize,
							pageIndex: 0,
							includeTotalCount: true
						}
						let morePages = true;
						let numberLeft = 0;
						while (morePages) {
							numberLeft = await this.queryAndSend(config, pair.featureLayerProcessors, obsRepo, pagingSettings, numberLeft);
							morePages = numberLeft > 0;
						}
						resolve();
					}));
				}
				await Promise.all(promises);

				for (const layerProcessor of this._layerProcessors) {
					layerProcessor.lastTimeStamp = nextQueryTime;
				}

				this._firstRun = false;

				// ArcGISIndentityManager access tokens may have been updated check and save
				this._identityService.updateIndentityManagers();
			}
			this.scheduleNext(config);
		}
	}

	private scheduleNext(config: ArcGISPluginConfig) {
		if (this._isRunning) {
			let interval = config.intervalSeconds;
			if (this._firstRun && config.featureServices.length > 0) {
				interval = config.startupIntervalSeconds;
			} else {
				for (const layerProcessor of this._layerProcessors) {
					if (layerProcessor.hasPendingUpdates()) {
						interval = config.updateIntervalSeconds;
						break;
					}
				}
			}
			this._nextTimeout = setTimeout(() => { this.processAndScheduleNext(); }, interval * 1000);
		}
	}

	/**
	 * Queries for new observations and sends them to any configured arc servers.
	 * @param {ArcGISPluginConfig} config The plugin configuration.
	 * @param {FeatureLayerProcessor[]} layerProcessors The layer processors to use when processing arc objects.
	 * @param {EventScopedObservationRepository} obsRepo The observation repo for an event.
	 * @param {PagingParameters} pagingSettings Current paging settings.
	 * @param {number} numberLeft The number of observations left to query and send to arc.
	 * @returns {Promise<number>} The number of observations still needing to be queried and sent to arc.
	 */
	private async queryAndSend(config: ArcGISPluginConfig, layerProcessors: FeatureLayerProcessor[], obsRepo: EventScopedObservationRepository, pagingSettings: PagingParameters, numberLeft: number): Promise<number> {
		let newNumberLeft = numberLeft;

		let queryTime = -1;
		for (const layerProcessor of layerProcessors) {
			if (queryTime === -1 || layerProcessor.lastTimeStamp < queryTime) {
				queryTime = layerProcessor.lastTimeStamp;
			}
		}

		const latestObs = await obsRepo.findLastModifiedAfter(queryTime, pagingSettings);
		if (latestObs?.totalCount != null && latestObs.totalCount > 0) {
			if (pagingSettings.pageIndex === 0) {
				this._console.info('ArcGIS newest observation count ' + latestObs.totalCount);
				newNumberLeft = latestObs.totalCount;
			}
			const observations = latestObs.items;
			const mageEvent = await this._eventRepo.findById(obsRepo.eventScope);
			const eventTransform = new EventTransform(config, mageEvent);
			const arcObjects = new ArcObjects();
			this._geometryChangeHandler.checkForGeometryChange(observations, arcObjects, layerProcessors, this._firstRun);
			for (const observation of observations) {
				// TODO: Should archived observations be removed after a certain time? Also this uses 'startsWith' because not all deleted observations use 'archived' which is a bug
				if (observation.states.length > 0 && observation.states[0].name.startsWith('archive')) {
					const arcObservation = this._transformer.createObservation(observation);
					arcObjects.deletions.push(arcObservation);
				} else {
					let user = null;
					if (observation.userId != null) {
						user = await this._userRepo.findById(observation.userId);
					}
					const arcObservation = this._transformer.transform(observation, eventTransform, user);
					arcObjects.add(arcObservation);
				}
			}
			arcObjects.firstRun = this._firstRun;
			for (const layerProcessor of layerProcessors) {
				layerProcessor.processArcObjects(arcObjects);
			}
			newNumberLeft -= latestObs.items.length;
			pagingSettings.pageIndex++;
		} else {
			this._console.info('ArcGIS no new observations');
		}

		return newNumberLeft;
	}
}