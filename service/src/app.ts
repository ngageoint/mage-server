import environment from './environment/env';
import log from './logger';
import { Logger } from './entities/entities.logging';
import {
  InjectableServices,
  integratePluginHooks
} from './main.impl/main.impl.plugins';
import httpLib from 'http';
import fs from 'fs-extra';
import mongoose, { plugin } from 'mongoose';
import express from 'express';
import util from 'util';
import {
  MongooseFeedServiceTypeRepository,
  FeedServiceTypeIdentityModel,
  MongooseFeedServiceRepository,
  FeedServiceModel,
  MongooseFeedRepository,
  FeedModel
} from './adapters/feeds/adapters.feeds.db.mongoose';
import { waitForDefaultMongooseConnection } from './adapters/adapters.db.mongoose';
import {
  FeedServiceTypeRepository,
  FeedServiceRepository,
  FeedRepository
} from './entities/feeds/entities.feeds';
import * as feedsApi from './app.api/feeds/app.api.feeds';
import * as feedsImpl from './app.impl/feeds/app.impl.feeds';
import * as eventsApi from './app.api/events/app.api.events';
import * as eventsImpl from './app.impl/events/app.impl.events';
import * as observationsApi from './app.api/observations/app.api.observations';
import * as observationsImpl from './app.impl/observations/app.impl.observations';
import { PreFetchedUserRoleFeedsPermissionService } from './permissions/permissions.feeds';
import { FeedsRoutes } from './adapters/feeds/adapters.feeds.controllers.web';
import { WebAppRequestFactory } from './adapters/adapters.controllers.web';
import { AppRequest, AppRequestContext, logPermissionDenials } from './app.api/app.api.global';
import { UserDocument } from './models/user';
import SimpleIdFactory from './adapters/adapters.simple_id_factory';
import {
  JsonSchemaService,
  JsonValidator,
  JSONSchema4
} from './entities/entities.json_types';
import {
  MageEventModel,
  MongooseMageEventRepository
} from './adapters/events/adapters.events.db.mongoose';
import {
  MageEvent,
  MageEventId,
  MageEventRepository
} from './entities/events/entities.events';
import { EventFeedsRoutes } from './adapters/events/adapters.events.controllers.web';
import {
  MongooseStaticIconRepository,
  StaticIconModel
} from './adapters/icons/adapters.icons.db.mongoose';
import { StaticIconRepository } from './entities/icons/entities.icons';
import { FileSystemIconContentStore } from './adapters/icons/adapters.icons.content_store.file_system';
import {
  StaticIconRoutes,
  StaticIconsAppLayer
} from './adapters/icons/adapters.icons.controllers.web';
import {
  ListStaticIcons,
  GetStaticIcon,
  GetStaticIconContent,
  CreateStaticIcon
} from './app.impl/icons/app.impl.icons';
import { RoleBasedStaticIconPermissionService } from './permissions/permissions.icons';
import { PluginUrlScheme } from './adapters/url_schemes/adapters.url_schemes.plugin';
import { WebUIPluginRoutes } from './adapters/web_ui_plugins/adapters.web_ui_plugins.controllers.web';
import {
  InitPluginHook,
  InjectionToken,
  PluginStateRepositoryToken
} from './plugins.api';
import { MageEventRepositoryToken } from './plugins.api/plugins.api.events';
import {
  FeedRepositoryToken,
  FeedServiceRepositoryToken,
  FeedServiceTypeRepositoryToken,
  FeedsAppServiceTokens
} from './plugins.api/plugins.api.feeds';
import { UserRepositoryToken } from './plugins.api/plugins.api.users';
import { StaticIconRepositoryToken } from './plugins.api/plugins.api.icons';
import {
  UserModel,
  MongooseUserRepository
} from './adapters/users/adapters.users.db.mongoose';
import { UserRepository, UserExpanded } from './entities/users/entities.users';
import { EnvironmentService } from './entities/systemInfo/entities.systemInfo';
import {
  WebRoutesHooks,
  GetAppRequestContext
} from './plugins.api/plugins.api.web';
import {
  UsersAppLayer,
  UsersRoutes
} from './adapters/users/adapters.users.controllers.web';
import { SearchUsers } from './app.impl/users/app.impl.users';
import { RoleBasedUsersPermissionService, RoleBasedUserPreferencesPermissionService } from './permissions/permissions.users';
import { UserPreferencesAppLayer, UserPreferencesRoutes } from './adapters/preferences/adapters.preferences.controllers.web';
import { GetEventPreferences } from './app.impl/preferences/app.impl.preferences';
import { UserPreferenceRepository } from './entities/users/entities.users';
import { MongoosePreferenceRepository, UserPreferenceModel } from './adapters/preferences/adapters.preferences.db.mongoose';
import { MongoosePluginStateRepository } from './adapters/plugins/adapters.plugins.db.mongoose';
import path from 'path';
import { MageEventDocument } from './models/event';
import { parseAcceptLanguageHeader } from './entities/entities.i18n';
import {
  ObservationRoutes,
  ObservationWebAppRequestFactory
} from './adapters/observations/adapters.observations.controllers.web';
import { AnonymousUser, UserWithRole } from './permissions/permissions.role-based.base';
import {
  AttachmentStore,
  EventScopedObservationRepository,
  ObservationRepositoryForEvent
} from './entities/observations/entities.observations';
import { createObservationRepositoryFactory } from './adapters/observations/adapters.observations.db.mongoose';
import {
  FileSystemAttachmentStoreInitError,
  intializeAttachmentStore
} from './adapters/observations/adapters.observations.attachment_store.file_system';
import {
  AttachmentStoreToken,
  ObservationRepositoryToken
} from './plugins.api/plugins.api.observations';
import {
  GetDbConnection,
  MongooseDbConnectionToken
} from './plugins.api/plugins.api.db';
import { EventEmitter } from 'events';
import { EnvironmentServiceImpl } from './adapters/systemInfo/adapters.systemInfo.service';
import { ApiVersion, SystemInfoAppLayer } from './app.api/systemInfo/app.api.systemInfo';
import { CreateReadSystemInfo } from './app.impl/systemInfo/app.impl.systemInfo';
import Settings from './models/setting';
import AuthenticationConfiguration from './models/authenticationconfiguration';
import AuthenticationConfigurationTransformer from './transformers/authenticationconfiguration';
import { SystemInfoRoutes } from './adapters/systemInfo/adapters.systemInfo.controllers.web';
import { RoleBasedSystemInfoPermissionService } from './permissions/permissions.systemInfo';
import {
  SettingsAppLayer,
  SettingsRoutes
} from './adapters/settings/adapters.settings.controllers.web';
import {
  MongooseSettingsRepository,
  SettingsModel
} from './adapters/settings/adapters.settings.db.mongoose';
import {
  FetchMapSettings,
  UpdateMapSettings
} from './app.impl/settings/app.impl.settings';
import { RoleBasedMapPermissionService } from './permissions/permissions.settings';
import { SettingRepository } from './entities/settings/entities.settings';
import * as exportsApi from './app.api/exports/app.api.exports';
import * as exportsImpl from './app.impl/exports/app.impl.exports';
import { ExportModel, MongooseExportsRepository } from './adapters/exports/adapters.exports.db.mongoose';
import { ExportFormat, ExportsRepository, ExportStore } from './entities/exports/entities.exports';
import { RoleBasedExportsPermissionService } from './permissions/permissions.exports';
import { ExportAppLayer, ExportRoutes, ExportWebAppRequestFactory, MyExportRoutes } from './adapters/exports/adapters.exports.controllers.web';
import { MongooseUserLocationRepository, UserLocationModel } from './adapters/locations/adapters.locations.db.mongoose';
import { MongooseRecentUserLocationsRepository, RecentUserLocationsModel } from './adapters/locations/adapters.locations.recent.db.mongoose';
import { RecentUserLocationsRepository, UserLocationRepository } from './entities/locations/entities.locations';
import * as locationsApi from './app.api/locations/app.api.locations';
import * as locationsImpl from './app.impl/locations/app.impl.locations';
import { RoleBasedLocationsPermissionService } from './permissions/permissions.locations';
import { LocationAppLayer, LocationRoutes, LocationWebAppRequestFactory } from './adapters/locations/adapters.locations.controllers.web';
import { FileSystemExportContentStore } from './adapters/exports/adapters.export_store.file_system';
import { ExportArchiveTask } from './adapters/exports/adapters.export_archive.task';
import { CsvExportTransform } from './app.impl/exports/app.impl.exports.csv';
import { DevicesRepository } from './entities/devices/entities.devices';
import { DeviceModel, MongooseDeviceRepository } from './adapters/devices/adapters.devices.db.mongoose';
import { KmlExportTransform } from './app.impl/exports/app.impl.exports.kml';
import { MongooseObservationIconRepository, ObservationIconModel } from './adapters/observations/adapters.observations.icons.db.mongoose';
import { ObservationIconContentStore, ObservationIconRepository } from './entities/observations/entities.observations.icons';
import { FileSystemObservationIconContentStore } from './adapters/observations/adapters.observations.icon.file_system';
import { FileSystemUserIconContentStore } from './adapters/users/adapters.users.icons.file_system';
import { UserIconContentStore } from './entities/users/entities.users';
import { GeoJsonExportTransform } from './app.impl/exports/app.impl.exports.geojson';
import { GeoPackageExportTransform } from './app.impl/exports/app.impl.exports.geopackage';

// Attachment imports
import { AttachmentHook } from './plugins.api/plugins.api.attachments';
import { startAttachmentProcessing } from './main.impl/main.impl.attachment_processing';

export interface MageService {
  webController: express.Application;
  server: httpLib.Server;
  open(): this;
}

export interface Task {
  run(): Promise<void>;
}

/**
 * The Express Application will emit this event when
 */
export const MageReadyEvent = 'comingOfMage';
export type BootConfig = {
  plugins: {
    /**
     * An array of service plugin package names
     */
    servicePlugins?: string[];
    /**
     * An array of web app plugin package names
     */
    webUIPlugins?: string[];
  };
};

let service: MageService | null = null;

export const boot = async function(config: BootConfig): Promise<MageService> {
  if (service) {
    return service as MageService;
  }

  const mongooseLogger = log.mongooseLogger;

  mongoose.set('debug', function(
    collection: any,
    method: any,
    ...methodArgs: any[]
  ) {
    const formatter = (arg: any): string => {
      return util
        .inspect(arg, false, 10, true)
        .replace(/\n/g, '')
        .replace(/\s{2,}/g, ' ');
    };

    mongooseLogger.debug(
      `${collection}.${method}(${methodArgs.map(formatter).join(', ')})`
    );
  });

  mongoose.Error.messages.general.required = '{PATH} is required.';

  log.info('Starting MAGE Server ...');

  logPermissionDenials(log.child({ component: 'permissions' }));

  // Create directory for storing media attachments
  const attachmentBase = environment.attachmentBaseDirectory;
  log.info(`creating attachments directory at ${attachmentBase}`);
  try {
    await fs.mkdirp(attachmentBase);
  } catch (err) {
    log.error(`error creating attachments directory ${attachmentBase}: `, err);
    throw err;
  }

  const iconBase = environment.iconBaseDirectory;
  log.info(`creating icon directory at ${iconBase}`);
  try {
    await fs.mkdirp(iconBase);
  } catch (err) {
    log.error(`error creating icon directory ${iconBase}: `, err);
    throw err;
  }

  const dbLayer = await initDatabase();
  const repos = await initRepositories(dbLayer, config);
  const tasks = await initTasks(repos, log.child({ component: 'export-archive' }));
  const attachmentHooks: AttachmentHook[] = [];
  const appLayer = await initAppLayer(repos, attachmentHooks);
  const { webController, addPluginRoutes } = await initWebLayer(
    repos,
    appLayer,
    config.plugins?.webUIPlugins || []
  );

  const routesForPluginId: { [pluginId: string]: WebRoutesHooks } = {};
  const collectPluginRoutesToSort = (
    pluginId: string,
    initPluginRoutes: WebRoutesHooks
  ): void => {
    routesForPluginId[pluginId] = initPluginRoutes;
  };

  // Hooks by plugin
  const attachmentHooksByPluginId: { [pluginId: string]: AttachmentHook[] } = {};
  const collectAttachmentHooks = (
    pluginId: string,
    attachmentHooks: AttachmentHook[]
  ): void => {
    attachmentHooksByPluginId[pluginId] = attachmentHooks;
  };

  const globalScopeServices = new Map<InjectionToken<any>, any>([
    [FeedServiceTypeRepositoryToken, repos.feeds.serviceTypeRepo],
    [FeedServiceRepositoryToken, repos.feeds.serviceRepo],
    [FeedRepositoryToken, repos.feeds.feedRepo],
    [MageEventRepositoryToken, repos.events.eventRepo],
    [ObservationRepositoryToken, repos.observations.obsRepoFactory],
    [AttachmentStoreToken, repos.observations.attachmentStore],
    [StaticIconRepositoryToken, repos.icons.staticIconRepo],
    [UserRepositoryToken, repos.users.userRepo],
    [FeedsAppServiceTokens.CreateFeed, appLayer.feeds.createFeed],
    [FeedsAppServiceTokens.UpdateFeed, appLayer.feeds.updateFeed],
    [FeedsAppServiceTokens.DeleteFeed, appLayer.feeds.deleteFeed]
  ]);

  for (const pluginId of config.plugins?.servicePlugins || []) {
    console.info(`loading plugin ${pluginId}...`);
    const pluginScopeServices = new Map<InjectionToken<any>, any>();

    const injectService: InjectableServices = <Service>(
      token: InjectionToken<Service>
    ) => {
      // TODO: hack for now but could be better
      if (token === PluginStateRepositoryToken) {
        let stateRepo = pluginScopeServices.get(PluginStateRepositoryToken);
        if (!stateRepo) {
          stateRepo = new MongoosePluginStateRepository(pluginId, mongoose);
          pluginScopeServices.set(PluginStateRepositoryToken, stateRepo);
        }
        return stateRepo;
      } else if (token === MongooseDbConnectionToken) {
        return dbLayer.connectionFactoryForPlugin(pluginId);
      }
      return globalScopeServices.get(token);
    };

    try {
      /*
      TODO: may need to switch to require.resolve() or custom api to load
      modules from a different plugins folder to properly support
      docker/container deployments with a base mage instance image and an
      externally-mounted plugins directory.
      */
      const initPlugin: InitPluginHook = await import(pluginId);
      await integratePluginHooks(
        pluginId,
        initPlugin,
        injectService,
        collectPluginRoutesToSort,
        collectAttachmentHooks,
        DomainEvents
      );
    } catch (err) {
      console.error(`error loading plugin ${pluginId}`, err);
    }
  }

  // Flatten hooks in array. Mutates the array declared earlier (not a
  // reassignment) so the reference already passed into storeAttachmentContent
  // reflects these contents once real requests start coming in.
  attachmentHooks.push(...Object.values(attachmentHooksByPluginId).flat())

  // Start the background job that finds attachments staged by
  // storeAttachmentContent and runs them through the now-final attachmentHooks
  // list. Core-owned (not tied to any one plugin's init()), since it must run
  // hooks contributed by any enabled plugin.
  startAttachmentProcessing(repos.observations.obsRepoFactory, repos.observations.attachmentStore, attachmentHooks, console);

  const pluginRoutePathsDescending = Object.keys(routesForPluginId)
    .sort()
    .reverse();

  for (const pluginId of pluginRoutePathsDescending) {
    addPluginRoutes(pluginId, routesForPluginId[pluginId]);
  }

  for (const task of tasks) {
    await task.run();
  }

  const server = httpLib.createServer(webController);
  service = {
    webController,
    server,
    open(): MageService {
      server.listen(environment.port, environment.address, () => {
        log.info(
          `MAGE Server listening at address ${environment.address} on port ${environment.port}`
        );
        webController.emit(MageReadyEvent, service);
      });
      return this;
    }
  };

  return service;
};

type DatabaseLayer = {
  conn: mongoose.Connection;
  connectionFactoryForPlugin: (pluginId: string) => GetDbConnection;
  devices: {
    device: DeviceModel;
  };
  feeds: {
    feedServiceTypeIdentity: FeedServiceTypeIdentityModel;
    feedService: FeedServiceModel;
    feed: FeedModel;
  };
  events: {
    event: MageEventModel;
  };
  exports: {
    export: ExportModel;
  };
  icons: {
    staticIcon: StaticIconModel;
  };
  users: {
    user: UserModel;
    preference: UserPreferenceModel;
  };
  observations: {
    icons: ObservationIconModel;
  };
  locations: {
    location: UserLocationModel;
    recentUserLocation: RecentUserLocationsModel;
  };
  settings: {
    setting: SettingsModel;
  };
};

type AppLayer = {
  events: {
    addFeedToEvent: eventsApi.AddFeedToEvent;
    listEventFeeds: eventsApi.ListEventFeeds;
    removeFeedFromEvent: eventsApi.RemoveFeedFromEvent;
    fetchFeedContent: feedsApi.FetchFeedContent;
  };
  observations: {
    allocateObservationId: observationsApi.AllocateObservationId;
    saveObservation: observationsApi.SaveObservation;
    storeAttachmentContent: observationsApi.StoreAttachmentContent;
    readAttachmentContent: observationsApi.ReadAttachmentContent;
  };
  feeds: {
    jsonSchemaService: JsonSchemaService;
    permissionService: feedsApi.FeedsPermissionService;
    listServiceTypes: feedsApi.ListFeedServiceTypes;
    previewTopics: feedsApi.PreviewTopics;
    createService: feedsApi.CreateFeedService;
    listServices: feedsApi.ListFeedServices;
    getService: feedsApi.GetFeedService;
    listTopics: feedsApi.ListServiceTopics;
    previewFeed: feedsApi.PreviewFeed;
    createFeed: feedsApi.CreateFeed;
    listAllFeeds: feedsApi.ListAllFeeds;
    listServiceFeeds: feedsApi.ListServiceFeeds;
    deleteService: feedsApi.DeleteFeedService;
    getFeed: feedsApi.GetFeed;
    updateFeed: feedsApi.UpdateFeed;
    deleteFeed: feedsApi.DeleteFeed;
  };
  exports: ExportAppLayer;
  locations: LocationAppLayer;
  icons: StaticIconsAppLayer;
  users: UsersAppLayer;
  userPreferences: UserPreferencesAppLayer;
  systemInfo: SystemInfoAppLayer;
  settings: SettingsAppLayer;
};

async function initDatabase(): Promise<DatabaseLayer> {
  const { uri, connectRetryDelay, connectTimeout, options } = environment.mongo;

  const conn = await waitForDefaultMongooseConnection(
    mongoose,
    uri,
    connectTimeout,
    connectRetryDelay,
    options
  ).then(() => mongoose.connection);

  const PluginConnectionFactory = function PluginConnectionFactory(
    pluginId: string
  ): GetDbConnection {
    const pluginMongoose = new mongoose.Mongoose();
    // TODO: add event listeners to plugin connections to log how plugins are using the connection
    // TODO: bufferCommands probably exists on mongoose 5+ types. 4 supports the option, but the typedefs don't
    const pluginOptions: mongoose.ConnectOptions & {
      bufferCommands: boolean;
    } = {
      ...options,
      minPoolSize: 5,
      maxPoolSize: 5,
      bufferCommands: false,
      autoIndex: false
    };

    return () => {
      console.info(`get db connection for plugin ${pluginId}`);
      return waitForDefaultMongooseConnection(
        pluginMongoose,
        uri,
        connectTimeout,
        connectRetryDelay,
        pluginOptions
      ).then(() => pluginMongoose.connection);
    };
  };

  // TODO: transition legacy model initialization
  // TODO: inject connection to migrations
  // TODO: explore performing migrations without mongoose models because current models may not be compatible with past migrations

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./models').initializeModels();

  const migrate = await import('./migrate');
  await migrate.runDatabaseMigrations(uri, options);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const eventModel = require('./models/event').Model;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const userModel = require('./models/user').Model;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const settingModel = require('./models/setting').Model;

  return {
    conn,
    connectionFactoryForPlugin: PluginConnectionFactory,
    devices: {
      device: DeviceModel(conn)
    },
    feeds: {
      feedServiceTypeIdentity: FeedServiceTypeIdentityModel(conn),
      feedService: FeedServiceModel(conn),
      feed: FeedModel(conn)
    },
    events: {
      event: eventModel
    },
    exports: {
      export: ExportModel(conn)
    },
    icons: {
      staticIcon: StaticIconModel(conn)
    },
    users: {
      user: userModel,
      preference: UserPreferenceModel(conn)
    },
    observations: {
      icons: ObservationIconModel(conn)
    },
    locations: {
      location: UserLocationModel(conn),
      recentUserLocation: RecentUserLocationsModel(conn)
    },
    settings: {
      setting: settingModel
    }
  };
}

type Repositories = {
  devices: {
    deviceRepo: DevicesRepository;
  };
  events: {
    eventRepo: MageEventRepository;
  };
  exports: {
    exportRepo: ExportsRepository;
    exportStore: ExportStore;
  };
  observations: {
    obsRepoFactory: ObservationRepositoryForEvent;
    attachmentStore: AttachmentStore;
    iconRepo: ObservationIconRepository;
    iconStore: ObservationIconContentStore;
  };
  feeds: {
    serviceTypeRepo: FeedServiceTypeRepository;
    serviceRepo: FeedServiceRepository;
    feedRepo: FeedRepository;
  };
  icons: {
    staticIconRepo: StaticIconRepository;
  };
  users: {
    userRepo: UserRepository;
    preferenceRepo: UserPreferenceRepository;
    iconStore: UserIconContentStore;
  };
  locations: {
    locationRepo: UserLocationRepository;
    recentUserLocationRepo: RecentUserLocationsRepository;
  };
  enviromentInfo: EnvironmentService;
  settings: {
    settingRepo: SettingRepository;
  };
};

// TODO: the real thing
const jsonSchemaService: JsonSchemaService = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async validateSchema(_schema: JSONSchema4): Promise<JsonValidator> {
    return {
      validate: async () => null
    };
  }
};

const DomainEvents = new EventEmitter({ captureRejections: true }).on(
  'error',
  (err: unknown) => {
    console.error('uncaught error in domain event handler:', err);
  }
);

async function initRepositories(
  models: DatabaseLayer,
  config: BootConfig
): Promise<Repositories> {
  const serviceTypeRepo = new MongooseFeedServiceTypeRepository(
    models.feeds.feedServiceTypeIdentity
  );
  const serviceRepo = new MongooseFeedServiceRepository(
    models.feeds.feedService
  );
  const feedRepo = new MongooseFeedRepository(
    models.feeds.feed,
    new SimpleIdFactory()
  );
  const eventRepo = new MongooseMageEventRepository(models.events.event);
  const deviceRepo = new MongooseDeviceRepository(models.devices.device);
  const exportRepo = new MongooseExportsRepository(
    models.exports.export,
    environment.exportTtl * 1000
  );
  const exportStore = new FileSystemExportContentStore(
    environment.exportDirectory
  );
  const staticIconRepo = new MongooseStaticIconRepository(
    models.icons.staticIcon,
    new SimpleIdFactory(),
    new FileSystemIconContentStore(environment.iconBaseDirectory),
    [new PluginUrlScheme(config.plugins?.servicePlugins || [])]
  );
  const userRepo = new MongooseUserRepository(models.users.user);
  const userIconStore = new FileSystemUserIconContentStore(
    environment.userBaseDirectory
  );
  const observationIconRepo = new MongooseObservationIconRepository(
    models.observations.icons
  );
  const observationIconStore = new FileSystemObservationIconContentStore(
    environment.iconBaseDirectory
  );
  const locationRepo = new MongooseUserLocationRepository(
    models.locations.location
  );
  const recentUserLocationRepo = new MongooseRecentUserLocationsRepository(
    models.locations.recentUserLocation
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./models/user').setLocationRepositories(locationRepo, recentUserLocationRepo);
  const userPreferenceRepo = new MongoosePreferenceRepository(
    models.users.preference
  );
  const settingRepo = new MongooseSettingsRepository(models.settings.setting);
  const attachmentStore = await intializeAttachmentStore(
    environment.attachmentBaseDirectory
  );
  const systemInfoService = new EnvironmentServiceImpl(models.conn);

  if (attachmentStore instanceof FileSystemAttachmentStoreInitError) {
    throw attachmentStore;
  }

  return {
    devices: {
      deviceRepo
    },
    feeds: {
      serviceTypeRepo,
      serviceRepo,
      feedRepo
    },
    events: {
      eventRepo
    },
    exports: {
      exportRepo,
      exportStore
    },
    observations: {
      obsRepoFactory: createObservationRepositoryFactory(
        eventRepo,
        DomainEvents
      ),
      iconRepo: observationIconRepo,
      iconStore: observationIconStore,
      attachmentStore
    },
    icons: {
      staticIconRepo
    },
    users: {
      userRepo,
      preferenceRepo: userPreferenceRepo,
      iconStore: userIconStore
    },
    locations: {
      locationRepo,
      recentUserLocationRepo
    },
    enviromentInfo: systemInfoService,
    settings: {
      settingRepo
    }
  };
}

async function initAppLayer(repos: Repositories, attachmentHooks: AttachmentHook[]): Promise<AppLayer> {
  const events = await initEventsAppLayer(repos);
  const exports = await initExportsAppLayer(repos, log.child({ component: 'export' }));
  const locations = await initLocationsAppLayer(repos);
  const observations = await initObservationsAppLayer(repos, attachmentHooks);
  const icons = await initIconsAppLayer(repos);
  const feeds = await initFeedsAppLayer(repos);
  const users = await initUsersAppLayer(repos);
  const userPreferences = initUserPreferencesAppLayer(repos);
  const systemInfo = initSystemInfoAppLayer(repos);
  const settings = await initSettingsAppLayer(
    repos,
    log.child({ component: 'settings' })
  );

  return {
    events,
    exports,
    locations,
    observations,
    feeds,
    icons,
    users,
    userPreferences,
    systemInfo,
    settings
  };
}

async function initLocationsAppLayer(repos: Repositories): Promise<AppLayer['locations']> {
  const eventPermissions = await import('./permissions/permissions.events');
  const locationPermissions = new RoleBasedLocationsPermissionService(
    eventPermissions.defaultEventPermissionsService
  );

  return {
    createLocations: locationsImpl.CreateLocations(
      repos.locations.locationRepo,
      repos.locations.recentUserLocationRepo,
      locationPermissions,
      DomainEvents
    ),
    readLocations: locationsImpl.ReadLocations(
      repos.locations.locationRepo,
      locationPermissions
    ),
    readLocationsGroupedByUser: locationsImpl.ReadLocationsGroupedByUser(
      repos.locations.recentUserLocationRepo,
      locationPermissions
    )
  };
}

async function initExportsAppLayer(
  repos: Repositories,
  logger: Logger
): Promise<AppLayer['exports']> {
  const eventPermissions = await import('./permissions/permissions.events');
  const exportPermissions = new RoleBasedExportsPermissionService(
    eventPermissions.defaultEventPermissionsService
  );

  const exportFactory = (format: ExportFormat): exportsApi.ExportTransform => {
    switch (format) {
      case 'csv': {
        return new CsvExportTransform(
          repos.locations.locationRepo,
          repos.observations.obsRepoFactory,
          repos.observations.attachmentStore,
          repos.devices.deviceRepo,
          repos.users.userRepo
        );
      }
      case 'kml': {
        return new KmlExportTransform(
          repos.locations.locationRepo,
          repos.observations.obsRepoFactory,
          repos.observations.iconRepo,
          repos.observations.iconStore,
          repos.observations.attachmentStore,
          repos.users.userRepo,
          repos.users.iconStore
        );
      }
      case 'geojson': {
        return new GeoJsonExportTransform(
          repos.locations.locationRepo,
          repos.observations.obsRepoFactory,
          repos.observations.attachmentStore,
          repos.devices.deviceRepo,
          repos.users.userRepo
        );
      }
      case 'geopackage': {
        return new GeoPackageExportTransform(
          repos.locations.locationRepo,
          repos.observations.obsRepoFactory,
          repos.observations.iconStore,
          repos.observations.attachmentStore,
          repos.observations.iconRepo,
          repos.users.userRepo,
          repos.users.iconStore,
          logger
        );
      }
    }
  };

  return {
    createExport: exportsImpl.CreateExport(
      exportFactory,
      repos.exports.exportRepo,
      repos.exports.exportStore,
      exportPermissions,
      logger
    ),
    getExports: exportsImpl.FetchExports(
      repos.exports.exportRepo,
      exportPermissions
    ),
    getExportContent: exportsImpl.GetExportContent(
      repos.exports.exportRepo,
      repos.exports.exportStore,
      exportPermissions
    ),
    deleteExport: exportsImpl.DeleteExport(
      repos.exports.exportRepo,
      repos.exports.exportStore,
      exportPermissions
    )
  };
}

async function initUsersAppLayer(
  repos: Repositories
): Promise<AppLayer['users']> {
  const usersPermissions = new RoleBasedUsersPermissionService();
  const searchUsers = SearchUsers(repos.users.userRepo, usersPermissions);
  return {
    searchUsers
  };
}

function initUserPreferencesAppLayer(repos: Repositories): UserPreferencesAppLayer {
  const permissions = new RoleBasedUserPreferencesPermissionService();
  return {
    getEventPreferences: GetEventPreferences(
      repos.users.preferenceRepo,
      permissions
    )
  };
}

async function initEventsAppLayer(
  repos: Repositories
): Promise<AppLayer['events']> {
  const eventPermissions = await import('./permissions/permissions.events');
  const eventFeedsPermissions = new eventPermissions.EventFeedsPermissionService(
    repos.events.eventRepo,
    eventPermissions.defaultEventPermissionsService
  );

  return {
    addFeedToEvent: eventsImpl.AddFeedToEvent(
      eventPermissions.defaultEventPermissionsService,
      repos.events.eventRepo
    ),
    listEventFeeds: eventsImpl.ListEventFeeds(
      eventPermissions.defaultEventPermissionsService,
      repos.events.eventRepo,
      repos.feeds.feedRepo
    ),
    removeFeedFromEvent: eventsImpl.RemoveFeedFromEvent(
      eventPermissions.defaultEventPermissionsService,
      repos.events.eventRepo
    ),
    fetchFeedContent: feedsImpl.FetchFeedContent(
      eventFeedsPermissions,
      repos.feeds.serviceTypeRepo,
      repos.feeds.serviceRepo,
      repos.feeds.feedRepo,
      jsonSchemaService
    )
  };
}

async function initObservationsAppLayer(
  repos: Repositories,
  attachmentHooks: AttachmentHook[]
): Promise<AppLayer['observations']> {
  const eventPermissions = await import('./permissions/permissions.events');
  const obsPermissions = await import('./permissions/permissions.observations');
  const obsPermissionsService =
    new obsPermissions.ObservationPermissionsServiceImpl(
      eventPermissions.defaultEventPermissionsService
    );

  observationsImpl.registerDeleteRemovedAttachmentsHandler(
    DomainEvents,
    repos.observations.attachmentStore,
    log.child({ component: 'observations' })
  );

  observationsImpl.registerRecordRecentFormFieldChoicesHandler(
    DomainEvents,
    repos.users.preferenceRepo,
    log.child({ component: 'observations' })
  );

  return {
    allocateObservationId: observationsImpl.AllocateObservationId(
      obsPermissionsService
    ),
    saveObservation: observationsImpl.SaveObservation(
      obsPermissionsService,
      repos.users.userRepo
    ),
    storeAttachmentContent: observationsImpl.StoreAttachmentContent(
      obsPermissionsService,
      repos.observations.attachmentStore,
      attachmentHooks
    ),
    readAttachmentContent: observationsImpl.ReadAttachmentContent(
      obsPermissionsService,
      repos.observations.attachmentStore
    )
  };
}

function initIconsAppLayer(repos: Repositories): StaticIconsAppLayer {
  const permissions = new RoleBasedStaticIconPermissionService();
  return {
    getIcon: GetStaticIcon(permissions, repos.icons.staticIconRepo),
    getIconContent: GetStaticIconContent(permissions, repos.icons.staticIconRepo),
     listIcons: ListStaticIcons(permissions),
    createIcon: CreateStaticIcon(permissions, repos.icons.staticIconRepo)
  };
}

function initFeedsAppLayer(repos: Repositories): AppLayer['feeds'] {
  const { serviceTypeRepo, serviceRepo, feedRepo } = repos.feeds;
  const permissionService = new PreFetchedUserRoleFeedsPermissionService();

  const listServiceTypes = feedsImpl.ListFeedServiceTypes(
    permissionService,
    serviceTypeRepo
  );
  const previewTopics = feedsImpl.PreviewTopics(
    permissionService,
    serviceTypeRepo
  );
  const createService = feedsImpl.CreateFeedService(
    permissionService,
    serviceTypeRepo,
    serviceRepo
  );
  const listServices = feedsImpl.ListFeedServices(
    permissionService,
    serviceTypeRepo,
    serviceRepo
  );
  const getService = feedsImpl.GetFeedService(
    permissionService,
    serviceTypeRepo,
    serviceRepo
  );
  const listTopics = feedsImpl.ListServiceTopics(
    permissionService,
    serviceTypeRepo,
    serviceRepo
  );
  const previewFeed = feedsImpl.PreviewFeed(
    permissionService,
    serviceTypeRepo,
    serviceRepo,
    jsonSchemaService,
    repos.icons.staticIconRepo
  );
  const createFeed = feedsImpl.CreateFeed(
    permissionService,
    serviceTypeRepo,
    serviceRepo,
    feedRepo,
    jsonSchemaService,
    repos.icons.staticIconRepo
  );
  const listAllFeeds = feedsImpl.ListAllFeeds(permissionService, feedRepo);
  const listServiceFeeds = feedsImpl.ListServiceFeeds(
    permissionService,
    serviceRepo,
    feedRepo
  );
  const deleteService = feedsImpl.DeleteFeedService(
    permissionService,
    serviceRepo,
    feedRepo,
    repos.events.eventRepo
  );
  const getFeed = feedsImpl.GetFeed(
    permissionService,
    serviceTypeRepo,
    serviceRepo,
    feedRepo
  );
  const updateFeed = feedsImpl.UpdateFeed(
    permissionService,
    serviceTypeRepo,
    serviceRepo,
    feedRepo,
    repos.icons.staticIconRepo
  );
  const deleteFeed = feedsImpl.DeleteFeed(
    permissionService,
    feedRepo,
    repos.events.eventRepo
  );

  return {
    jsonSchemaService,
    permissionService,
    listServiceTypes,
    previewTopics,
    createService,
    listServices,
    getService,
    listTopics,
    previewFeed,
    createFeed,
    listAllFeeds,
    listServiceFeeds,
    deleteService,
    getFeed,
    updateFeed,
    deleteFeed
  };
}

function initSystemInfoAppLayer(repos: Repositories): SystemInfoAppLayer {
  const permissionsService = new RoleBasedSystemInfoPermissionService();
  const packageJson = require('../package.json');
  const [major, minor, patch] = packageJson.apiVersion.split('.').map(Number);
  const version: ApiVersion = { major, minor, patch };
  const serverVersion: string = packageJson.version;
  return {
    readSystemInfo: CreateReadSystemInfo(
      repos.enviromentInfo,
      version,
      serverVersion,
      Settings,
      AuthenticationConfiguration,
      AuthenticationConfigurationTransformer,
      permissionsService
    ),
    permissionsService
  };
}

async function initSettingsAppLayer(
  repos: Repositories,
  logger: Logger
): Promise<AppLayer['settings']> {
  const mapPermissions = new RoleBasedMapPermissionService();
  const getMapSettings = FetchMapSettings(repos.settings.settingRepo, mapPermissions, logger);
  const updateMapSettings = UpdateMapSettings(repos.settings.settingRepo, mapPermissions, logger);
  return {
    getMapSettings,
    updateMapSettings
  };
}

interface MageEventRequestContext extends AppRequestContext<UserDocument> {
  event: MageEventDocument | MageEvent | undefined;
}

const exportEventScopeKey = 'exportEventScope' as const;
const observationEventScopeKey = 'observationEventScope' as const;
const locationEventScopeKey = 'locationEventScope' as const;

async function initWebLayer(
  repos: Repositories,
  app: AppLayer,
  webUIPlugins: string[]
): Promise<{
  webController: express.Application;
  addPluginRoutes: (pluginId: string, initPluginRoutes: WebRoutesHooks) => void;
}> {
  // load routes the old way
  const webLayer = await import('./express');
  const webController = webLayer.app;
  const webAuth = webLayer.auth;

  const appRequestFactory: WebAppRequestFactory = <Params>(
    req: express.Request,
    params: Params
  ): AppRequest<UserDocument, MageEventRequestContext> & Params => {
    return {
      ...params,
      context: {
        ...baseAppRequestContext(req),
        event: (req as any).event || (req as any).eventEntity
      }
    };
  };

  const bearerAuthentication = webAuth.bearerAuthentication;

  // Attempts bearer authentication but never rejects the request - if a valid
  // token is present req.user is populated, otherwise req.user is set to an
  // AnonymousUser so routes can return a reduced/redacted response.
  const optionalBearerAuthentication: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => void = (req, res, next) => {
    webAuth.passport.authenticate('bearer', { session: false }, (err: any, user: UserWithRole) => {
      if (err) return next(err)
      req.user = user as UserWithRole || {} as AnonymousUser
      next()
    })(req, res, next)
  }

  const settingsRoutes = SettingsRoutes(app.settings, appRequestFactory);
  webController.use('/api/settings', [bearerAuthentication, settingsRoutes]);

  const usersRoutes = UsersRoutes(app.users, appRequestFactory);
  webController.use('/api/next-users', [bearerAuthentication, usersRoutes]);

  const feedsRoutes = FeedsRoutes(app.feeds, appRequestFactory);
  webController.use('/api/feeds', [bearerAuthentication, feedsRoutes]);

  const iconsRoutes = StaticIconRoutes(app.icons, appRequestFactory);
  webController.use('/api/icons', [bearerAuthentication, iconsRoutes]);

  const systemInfoRoutes = SystemInfoRoutes(app.systemInfo, appRequestFactory);
  webController.use('/api', [optionalBearerAuthentication, systemInfoRoutes]);

  const observationRequestFactory: ObservationWebAppRequestFactory = <
    Params extends object | undefined
  >(
    req: express.Request,
    params: Params
  ) => {
    const context: observationsApi.ObservationRequestContext = {
      ...baseAppRequestContext(req),
      mageEvent: req[observationEventScopeKey]!.mageEvent,
      userId: (req.user as any).id,
      deviceId: (req as any).provisionedDeviceId,
      observationRepository: req[observationEventScopeKey]!.observationRepository
    };
    return { ...params, context };
  };

  const observationsRoutes = ObservationRoutes(
    app.observations,
    repos.observations.attachmentStore,
    observationRequestFactory
  );

  webController.use(`/api/events/:${observationEventScopeKey}/observations`, [
    bearerAuthentication,
    ensureObservationEventScope(repos.events.eventRepo, repos.observations.obsRepoFactory),
    observationsRoutes
  ]);

  const eventFeedsRoutes = EventFeedsRoutes(
    { ...app.events, eventRepo: repos.events.eventRepo },
    appRequestFactory
  );
  webController.use('/api/events', [bearerAuthentication, eventFeedsRoutes]);

  const exportRequestFactory: ExportWebAppRequestFactory = <
    Params extends object | undefined
  >(
    req: express.Request,
    params: Params
  ) => {
    const context: exportsApi.CreateExportRequestContext = {
      ...baseAppRequestContext(req),
      mageEvent: req[exportEventScopeKey]!.mageEvent
    };

    return { ...params, context };
  };
  const exportRoutes = ExportRoutes(app.exports, exportRequestFactory);
  webController.use(`/api/events/:${exportEventScopeKey}/exports`, [
    bearerAuthentication,
    ensureExportEventScope(repos.events.eventRepo),
    exportRoutes
  ]);

  const myExportRoutes = MyExportRoutes(app.exports, appRequestFactory);
  webController.use(`/api/exports/mine`, [bearerAuthentication, myExportRoutes]);

  const locationRequestFactory: LocationWebAppRequestFactory = <
    Params extends object | undefined
  >(
    req: express.Request,
    params: Params
  ) => {
    const context: locationsApi.LocationRequestContext = {
      ...baseAppRequestContext(req),
      mageEvent: req[locationEventScopeKey]!.mageEvent
    };

    return { ...params, context };
  };
  const locationRoutes = LocationRoutes(app.locations, locationRequestFactory);
  webController.use(`/api/events/:${locationEventScopeKey}/locations`, [
    bearerAuthentication,
    ensureLocationEventScope(repos.events.eventRepo),
    locationRoutes
  ]);

  const preferencesRoutes = UserPreferencesRoutes(app.userPreferences, appRequestFactory);
  webController.use(`/api/my/preferences`, [bearerAuthentication, preferencesRoutes]);

  const webUiPluginRoutes = WebUIPluginRoutes(webUIPlugins);

  webController.use('/ui_plugins', [
    bearerAuthentication,
    webUiPluginRoutes
  ]);

  const pluginAppRequestContext: GetAppRequestContext = (
    req: express.Request
  ): AppRequestContext<UserExpanded> => {
    return {
      requestToken: Symbol(),
      requestingPrincipal(): UserExpanded {
        return {
          ...(req.user as any).toJSON(),
          id: (req.user as any)._id.toHexString()
        } as UserExpanded;
      },
      locale(): Readonly<{
        languagePreferences: ReturnType<typeof parseAcceptLanguageHeader>;
      }> {
        return Object.freeze({
          languagePreferences: parseAcceptLanguageHeader(
            req.headers['accept-language']
          )
        });
      }
    };
  };

  try {
    const webAppPackagePath = require.resolve('@ngageoint/mage.web-app/package.json');
    const webAppPath = path.dirname(webAppPackagePath);
    webController.use(express.static(webAppPath));
  } catch (err) {
    console.warn('failed to load mage web app package', err);
  }

  return {
    webController,
    addPluginRoutes: (
      pluginId: string,
      initPluginRoutes: WebRoutesHooks
    ): void => {
      if (initPluginRoutes.webRoutes.public) {
        const routes = initPluginRoutes.webRoutes.public(pluginAppRequestContext);
        webController.use(`/plugins/${pluginId}`, [routes]);
      }

      if (initPluginRoutes.webRoutes.protected) {
        const routes = initPluginRoutes.webRoutes.protected(pluginAppRequestContext);
        webController.use(`/plugins/${pluginId}`, [bearerAuthentication, routes]);
      }
    }
  };
}

async function initTasks(repos: Repositories, logger: Logger): Promise<Task[]> {
  const exportTask = new ExportArchiveTask(
    environment.exportDirectory,
    environment.exportSweepInterval,
    repos.exports.exportStore,
    repos.exports.exportRepo,
    logger
  );

  return [exportTask];
}

function baseAppRequestContext(
  req: express.Request
): AppRequestContext<UserWithRole> {
  return {
    requestToken: Symbol(),
    requestingPrincipal(): UserWithRole {
      return req.user as UserWithRole || {} as AnonymousUser
    },
    locale(): Readonly<{
      languagePreferences: ReturnType<typeof parseAcceptLanguageHeader>;
    }> {
      return Object.freeze({
        languagePreferences: parseAcceptLanguageHeader(
          req.headers['accept-language']
        )
      });
    }
  };
}

function ensureExportEventScope(
  eventRepo: MageEventRepository
): express.RequestHandler {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    const eventIdFromPath = req.params[exportEventScopeKey];
    const eventId: MageEventId = parseInt(eventIdFromPath);
    const mageEvent = Number.isInteger(eventId)
      ? await eventRepo.findById(eventId)
      : null;
    if (mageEvent) {
      req[exportEventScopeKey] = { mageEvent };
      next();
      return;
    }
    res.status(404).json(`event not found: ${eventIdFromPath}`);
  };
}

function ensureObservationEventScope(
  eventRepo: MageEventRepository,
  createObsRepo: ObservationRepositoryForEvent
): express.RequestHandler {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    const eventIdFromPath = req.params[observationEventScopeKey];
    const eventId: MageEventId = parseInt(eventIdFromPath);
    const mageEvent = Number.isInteger(eventId)
      ? await eventRepo.findById(eventId)
      : null;

    if (mageEvent) {
      const observationRepository = await createObsRepo(mageEvent.id);
      req[observationEventScopeKey] = { mageEvent, observationRepository };
      next();
      return;
    }

    res.status(404).json(`event not found: ${eventIdFromPath}`);
  };
}

function ensureLocationEventScope(
  eventRepo: MageEventRepository
): express.RequestHandler {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    const eventIdFromPath = req.params[locationEventScopeKey];
    const eventId: MageEventId = parseInt(eventIdFromPath);
    const mageEvent = Number.isInteger(eventId)
      ? await eventRepo.findById(eventId)
      : null;
    if (mageEvent) {
      req[locationEventScopeKey] = { mageEvent };
      next();
      return;
    }
    res.status(404).json(`event not found: ${eventIdFromPath}`);
  };
}

declare module 'express' {
  interface Request {
    [exportEventScopeKey]?: {
      mageEvent: MageEvent;
    };
    [observationEventScopeKey]?: {
      mageEvent: MageEvent;
      observationRepository: EventScopedObservationRepository;
    };
    [locationEventScopeKey]?: {
      mageEvent: MageEvent;
    };
  }
}
