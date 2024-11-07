import { PagingParameters } from '@ngageoint/mage.service/lib/entities/entities.global';
import { MageEventRepository } from '@ngageoint/mage.service/lib/entities/events/entities.events';
import { EventScopedObservationRepository, ObservationRepositoryForEvent } from '@ngageoint/mage.service/lib/entities/observations/entities.observations';
import { UserRepository } from '@ngageoint/mage.service/lib/entities/users/entities.users';
import { ArcGISPluginConfig, defaultArcGISPluginConfig } from './ArcGISPluginConfig';
import { ObservationsTransformer } from './ObservationsTransformer'
import { ArcObjects } from './ArcObjects'
import { FeatureService } from './FeatureService';
import { FeatureServiceResult, FeatureLayer } from './FeatureServiceResult';
import { LayerInfo } from './LayerInfo';
import { LayerInfoResult } from "./LayerInfoResult";
import { FeatureLayerProcessor } from './FeatureLayerProcessor';
import { EventTransform } from './EventTransform';
import { GeometryChangedHandler } from './GeometryChangedHandler';
import { EventDeletionHandler } from './EventDeletionHandler';
import { EventLayerProcessorOrganizer } from './EventLayerProcessorOrganizer';
import { FeatureServiceConfig, FeatureLayerConfig } from "./ArcGISConfig"
import { PluginStateRepository } from '@ngageoint/mage.service/lib/plugins.api'
import { FeatureServiceAdmin } from './FeatureServiceAdmin';
import { request } from '@esri/arcgis-rest-request';
import { ArcGISIdentityService } from './ArcGISService';

/**
 * Class that wakes up at a certain configured interval and processes any new observations that can be
 * sent to any specified ArcGIS feature layers.
 */
export class ObservationProcessor {

	/**
	 * True if the processor is currently active, false otherwise.
	 */
	private _isRunning = false;

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
	private _identityService: ArcGISIdentityService

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
	private _firstRun: boolean;

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
	 * @param stateRepo The plugins configuration.
	 * @param eventRepo Used to get all the active events.
	 * @param obsRepo Used to get new observations.
	 * @param userRepo Used to get user information.
	 * @param console Used to log to the console.
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
		this._identityService = identityService
		this._console = console;
		this._firstRun = true;
		this._organizer = new EventLayerProcessorOrganizer();
		this._transformer = new ObservationsTransformer(defaultArcGISPluginConfig, console);
		this._geometryChangeHandler = new GeometryChangedHandler(this._transformer);
		this._eventDeletionHandler = new EventDeletionHandler(this._console, defaultArcGISPluginConfig);
	}

	/**
	 * Gets the current configuration from the database.
	 * @returns The current configuration from the database.
	 */
	public async safeGetConfig(): Promise<ArcGISPluginConfig> {
		const state = await this._stateRepo.get();
		if (!state) return await this._stateRepo.put(defaultArcGISPluginConfig);
		return await this._stateRepo.get().then((state) => state ? state : this._stateRepo.put(defaultArcGISPluginConfig));
	}

	/**
	 * Puts a new confguration in the state repo.
	 * @param newConfig The new config to put into the state repo.
	 */
	public async putConfig(newConfig: ArcGISPluginConfig): Promise<ArcGISPluginConfig> {
		return await this._stateRepo.put(newConfig);
	}

	/**
	 * Updates the confguration in the state repo.
	 * @param newConfig The new config to put into the state repo.
	 */
	public async patchConfig(newConfig: ArcGISPluginConfig): Promise<ArcGISPluginConfig> {
		return await this._stateRepo.patch(newConfig);
	}

	/**
	 * Gets the current configuration and updates the processor if needed
	 * @returns The current configuration from the database.
	 */
	private async updateConfig(): Promise<ArcGISPluginConfig> {
		const config = await this.safeGetConfig()
		const configJson = JSON.stringify(config)
		if (this._previousConfig == null || this._previousConfig != configJson) {
			this._transformer = new ObservationsTransformer(config, console);
			this._geometryChangeHandler = new GeometryChangedHandler(this._transformer);
			this._eventDeletionHandler = new EventDeletionHandler(this._console, config);
			this._layerProcessors = [];
			this.getFeatureServiceLayers(config);
			this._previousConfig = configJson
			this._firstRun = true;
		}
		return config
	}

	/**
	 * Starts the processor.
	 */
	async start() {
		this._isRunning = true;
		this._firstRun = true;
		this.processAndScheduleNext();
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
	 * @param config The plugins configuration.
	 */
	private async getFeatureServiceLayers(config: ArcGISPluginConfig) {
		for (const service of config.featureServices) {
			try {
				const identityManager = await this._identityService.getIdentityManager(service)
				const response = await request(service.url, { authentication: identityManager })
				this.handleFeatureService(response, service, config)
			} catch (err) {
				console.error(err)
			}
		}
	}

	/**
	 * Called when information on a feature service is returned from an arc server.
	 * @param featureService The feature service.
	 * @param featureServiceConfig The feature service config.
	 * @param config The plugin configuration.
	 */
	private async handleFeatureService(featureService: FeatureServiceResult, featureServiceConfig: FeatureServiceConfig, config: ArcGISPluginConfig) {

		if (featureService.layers != null) {

			const serviceLayers = new Map<any, FeatureLayer>()
			const admin = new FeatureServiceAdmin(config, this._identityService, this._console)

			let maxId = -1
			for (const layer of featureService.layers) {
				serviceLayers.set(layer.id, layer)
				serviceLayers.set(layer.name, layer)
				maxId = Math.max(maxId, layer.id)
			}

			for (const featureLayer of featureServiceConfig.layers) {
				const eventNames: string[] = []
				const events = featureLayer.events
				if (events != null) {
					for (const event of events) {
						const eventId = Number(event);
						if (isNaN(eventId)) {
							eventNames.push(String(event));
						} else {
							const mageEvent = await this._eventRepo.findById(eventId)
							if (mageEvent != null) {
								eventNames.push(mageEvent.name);
							}
						}
					}
				}
				if (eventNames.length > 0) {
					featureLayer.events = eventNames
				}

				const layer = serviceLayers.get(featureLayer.layer)

				let layerId = undefined
				if (layer != null) {
					layerId = layer.id
				} else {
					layerId = await admin.createLayer(featureServiceConfig, featureLayer, maxId + 1, this._eventRepo)
					maxId = Math.max(maxId, layerId)
				}

				if (layerId != null) {
					featureLayer.layer = layerId
					const identityManager = await this._identityService.getIdentityManager(featureServiceConfig)
					const featureService = new FeatureService(console, featureServiceConfig, identityManager)
					const layerInfo = await featureService.queryLayerInfo(layerId);
					const url = `${featureServiceConfig.url}/${layerId}`;
					this.handleLayerInfo(url, featureServiceConfig, featureLayer, layerInfo, config);
				}
			}
		}
	}

	/**
	 * Called when information on a feature layer is returned from an arc server.
	 * @param url The layer url.
	 * @param featureServiceConfig The feature service config.
	 * @param featureLayer The feature layer configuration.
	 * @param layerInfo The information on a layer.
	 * @param config The plugins configuration.
	 */
	private async handleLayerInfo(url: string, featureServiceConfig: FeatureServiceConfig, featureLayer: FeatureLayerConfig, layerInfo: LayerInfoResult, config: ArcGISPluginConfig) {
		if (layerInfo.geometryType != null) {
			const events = featureLayer.events as string[]
			const admin = new FeatureServiceAdmin(config, this._identityService, this._console)
			await admin.updateLayer(featureServiceConfig, featureLayer, layerInfo, this._eventRepo)
			const info = new LayerInfo(url, events, layerInfo)
			const identityManager = await this._identityService.getIdentityManager(featureServiceConfig)
			const layerProcessor = new FeatureLayerProcessor(info, config, identityManager, this._console);
			this._layerProcessors.push(layerProcessor);
			// clearTimeout(this._nextTimeout); // TODO why is this needed?
			// this.scheduleNext(config); // TODO why is this needed when processAndScheduleNext is called upstream and ends with scheduleNext() This causes a query before updateLayer.
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
				for (const layerProcessor of this._layerProcessors) {
					layerProcessor.processPendingUpdates();
				}
				this._console.info('ArcGIS plugin processing new observations...');
				const activeEvents = await this._eventRepo.findActiveEvents();
				this._eventDeletionHandler.checkForEventDeletion(activeEvents, this._layerProcessors, this._firstRun);
				const eventsToProcessors = this._organizer.organize(activeEvents, this._layerProcessors);
				const nextQueryTime = Date.now();
				for (const pair of eventsToProcessors) {
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
				}

				for (const layerProcessor of this._layerProcessors) {
					layerProcessor.lastTimeStamp = nextQueryTime;
				}

				this._firstRun = false;

				// ArcGISIndentityManager access tokens may have been updated check and save
				this._identityService.updateIndentityManagers()
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
			this._nextTimeout = setTimeout(() => { this.processAndScheduleNext() }, interval * 1000);
		}
	}

	/**
	 * Queries for new observations and sends them to any configured arc servers.
	 * @param config The plugin configuration.
	 * @param layerProcessors The layer processors to use when processing arc objects.
	 * @param obsRepo The observation repo for an event.
	 * @param pagingSettings Current paging settings.
	 * @param numberLeft The number of observations left to query and send to arc.
	 * @returns The number of observations still needing to be queried and sent to arc.
	 */
	private async queryAndSend(config: ArcGISPluginConfig, layerProcessors: FeatureLayerProcessor[], obsRepo: EventScopedObservationRepository, pagingSettings: PagingParameters, numberLeft: number): Promise<number> {
		let newNumberLeft = numberLeft;

		let queryTime = -1;
		for (const layerProcessor of layerProcessors) {
			if (queryTime == -1 || layerProcessor.lastTimeStamp < queryTime) {
				queryTime = layerProcessor.lastTimeStamp;
			}
		}

		let latestObs = await obsRepo.findLastModifiedAfter(queryTime, pagingSettings);
		if (latestObs != null && latestObs.totalCount != null && latestObs.totalCount > 0) {
			if (pagingSettings.pageIndex == 0) {
				this._console.info('ArcGIS newest observation count ' + latestObs.totalCount);
				newNumberLeft = latestObs.totalCount;
			}
			const observations = latestObs.items
			const mageEvent = await this._eventRepo.findById(obsRepo.eventScope)
			const eventTransform = new EventTransform(config, mageEvent)
			const arcObjects = new ArcObjects()
			this._geometryChangeHandler.checkForGeometryChange(observations, arcObjects, layerProcessors, this._firstRun);
			for (let i = 0; i < observations.length; i++) {
				const observation = observations[i]
				let deletion = false
				if (observation.states.length > 0) {
					deletion = observation.states[0].name.startsWith('archive')
				}
				if (deletion) {
					const arcObservation = this._transformer.createObservation(observation)
					arcObjects.deletions.push(arcObservation)
				} else {
					let user = null
					if (observation.userId != null) {
						user = await this._userRepo.findById(observation.userId)
					}
					const arcObservation = this._transformer.transform(observation, eventTransform, user)
					arcObjects.add(arcObservation)
				}
			}
			arcObjects.firstRun = this._firstRun;
			for (const layerProcessor of layerProcessors) {
				layerProcessor.processArcObjects(JSON.parse(JSON.stringify(arcObjects)));
			}
			newNumberLeft -= latestObs.items.length;
			pagingSettings.pageIndex++;
		} else {
			this._console.info('ArcGIS no new observations')
		}

		return newNumberLeft;
	}
}