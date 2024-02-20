import environment from './environment/env'
import log from './logger'
import { InjectableServices, integratePluginHooks } from './main.impl/main.impl.plugins'
import httpLib from 'http'
import fs from 'fs-extra'
import mongoose from 'mongoose'
import express from 'express'
import util from 'util'
import { MongooseFeedServiceTypeRepository, FeedServiceTypeIdentityModel, MongooseFeedServiceRepository, FeedServiceModel, MongooseFeedRepository, FeedModel } from './adapters/feeds/adapters.feeds.db.mongoose'
import { waitForDefaultMongooseConnection } from './adapters/adapters.db.mongoose'
import { FeedServiceTypeRepository, FeedServiceRepository, FeedRepository } from './entities/feeds/entities.feeds'
import * as feedsApi from './app.api/feeds/app.api.feeds'
import * as feedsImpl from './app.impl/feeds/app.impl.feeds'
import * as eventsApi from './app.api/events/app.api.events'
import * as eventsImpl from './app.impl/events/app.impl.events'
import * as observationsApi from './app.api/observations/app.api.observations'
import * as observationsImpl from './app.impl/observations/app.impl.observations'
import { PreFetchedUserRoleFeedsPermissionService } from './permissions/permissions.feeds'
import { FeedsRoutes } from './adapters/feeds/adapters.feeds.controllers.web'
import { WebAppRequestFactory } from './adapters/adapters.controllers.web'
import { AppRequest, AppRequestContext } from './app.api/app.api.global'
import { UserDocument } from './models/user'
import SimpleIdFactory from './adapters/adapters.simple_id_factory'
import { JsonSchemaService, JsonValidator, JSONSchema4 } from './entities/entities.json_types'
import { MageEventModel, MongooseMageEventRepository } from './adapters/events/adapters.events.db.mongoose'
import { MageEvent, MageEventId, MageEventRepository } from './entities/events/entities.events'
import { EventFeedsRoutes } from './adapters/events/adapters.events.controllers.web'
import { MongooseStaticIconRepository, StaticIconModel } from './adapters/icons/adapters.icons.db.mongoose'
import { StaticIconRepository } from './entities/icons/entities.icons'
import { FileSystemIconContentStore } from './adapters/icons/adapters.icons.content_store.file_system'
import { StaticIconRoutes, StaticIconsAppLayer } from './adapters/icons/adapters.icons.controllers.web'
import { ListStaticIcons, GetStaticIcon, GetStaticIconContent } from './app.impl/icons/app.impl.icons'
import { RoleBasedStaticIconPermissionService } from './permissions/permissions.icons'
import { PluginUrlScheme } from './adapters/url_schemes/adapters.url_schemes.plugin'
import { WebUIPluginRoutes } from './adapters/web_ui_plugins/adapters.web_ui_plugins.controllers.web'
import { InitPluginHook, InjectionToken, PluginStateRepositoryToken } from './plugins.api'
import { MageEventRepositoryToken } from './plugins.api/plugins.api.events'
import { FeedRepositoryToken, FeedServiceRepositoryToken, FeedServiceTypeRepositoryToken, FeedsAppServiceTokens } from './plugins.api/plugins.api.feeds'
import { UserRepositoryToken } from './plugins.api/plugins.api.users'
import { StaticIconRepositoryToken } from './plugins.api/plugins.api.icons'
import { UserModel, MongooseUserRepository } from './adapters/users/adapters.users.db.mongoose'
import { UserRepository, UserExpanded } from './entities/users/entities.users'
import { WebRoutesHooks, GetAppRequestContext } from './plugins.api/plugins.api.web'
import { UsersAppLayer, UsersRoutes } from './adapters/users/adapters.users.controllers.web'
import { SearchUsers } from './app.impl/users/app.impl.users'
import { RoleBasedUsersPermissionService } from './permissions/permissions.users'
import { MongoosePluginStateRepository } from './adapters/plugins/adapters.plugins.db.mongoose'
import path from 'path'
import { MageEventDocument } from './models/event'
import { parseAcceptLanguageHeader } from './entities/entities.i18n'
import { ObservationRoutes, ObservationWebAppRequestFactory } from './adapters/observations/adapters.observations.controllers.web'
import { UserWithRole } from './permissions/permissions.role-based.base'
import { AttachmentStore, EventScopedObservationRepository, ObservationRepositoryForEvent } from './entities/observations/entities.observations'
import { createObservationRepositoryFactory } from './adapters/observations/adapters.observations.db.mongoose'
import { FileSystemAttachmentStoreInitError, intializeAttachmentStore } from './adapters/observations/adapters.observations.attachment_store.file_system'
import { AttachmentStoreToken, ObservationRepositoryToken } from './plugins.api/plugins.api.observations'
import { GetDbConnection, MongooseDbConnectionToken } from './plugins.api/plugins.api.db'
import { EventEmitter } from 'events'
import { SettingsAppLayer, SettingsRoutes } from './adapters/settings/adapters.settings.controllers.web'
import { MongooseSettingsRepository, SettingsModel } from './adapters/settings/adapters.settings.db.mongoose'
import { FetchMapSettings, UpdateMapSettings } from './app.impl/settings/app.impl.settings'
import { RoleBasedMapPermissionService } from './permissions/permissions.settings'
import { SettingRepository } from './entities/settings/entities.settings'


export interface MageService {
  webController: express.Application
  server: httpLib.Server
  open(): this
}

/**
 * The Express Application will emit this event when
 */
export const MageReadyEvent = 'comingOfMage'
export type BootConfig = {
  plugins: {
    /**
     * An array of service plugin package names
     */
    servicePlugins?: string[]
    /**
     * An array of web app plugin package names
     */
    webUIPlugins?: string[]
  }
}

let service: MageService | null = null

export const boot = async function(config: BootConfig): Promise<MageService> {
  if (service) {
    return service as MageService
  }

  const mongooseLogger = log.loggers.get('mongoose')
  mongoose.set('debug', function (collection: any, method: any, ...methodArgs: any[]) {
    const formatter = (arg: any): string => {
      return util.inspect(arg, false, 10, true).replace(/\n/g, '').replace(/\s{2,}/g, ' ');
    }
    mongooseLogger.log('mongoose', `${collection}.${method}` + `(${methodArgs.map(formatter).join(', ')})`)
  })

  mongoose.Error.messages.general.required = "{PATH} is required."

  log.info('Starting MAGE Server ...')

  // Create directory for storing media attachments
  const attachmentBase = environment.attachmentBaseDirectory
  log.info(`creating attachments directory at ${attachmentBase}`)
  try {
    await fs.mkdirp(attachmentBase)
  }
  catch (err) {
    log.error(`error creating attachments directory ${attachmentBase}: `, err)
    throw err
  }

  const iconBase = environment.iconBaseDirectory
  log.info(`creating icon directory at ${iconBase}`)
  try {
    await fs.mkdirp(iconBase)
  }
  catch (err) {
    log.error(`error creating icon directory ${iconBase}: `, err)
    throw err
  }

  const dbLayer = await initDatabase()
  const repos = await initRepositories(dbLayer, config)
  const appLayer = await initAppLayer(repos)

  const { webController, addAuthenticatedPluginRoutes } = await initWebLayer(repos, appLayer, config.plugins?.webUIPlugins || [])
  const routesForPluginId: { [pluginId: string]: WebRoutesHooks['webRoutes'] } = {}
  const collectPluginRoutesToSort = (pluginId: string, initPluginRoutes: WebRoutesHooks['webRoutes']) => {
    routesForPluginId[pluginId] = initPluginRoutes
  }
  const globalScopeServices = new Map<InjectionToken<any>, any>([
    [ FeedServiceTypeRepositoryToken, repos.feeds.serviceTypeRepo ],
    [ FeedServiceRepositoryToken, repos.feeds.serviceRepo ],
    [ FeedRepositoryToken, repos.feeds.feedRepo ],
    [ MageEventRepositoryToken, repos.events.eventRepo ],
    [ ObservationRepositoryToken, repos.observations.obsRepoFactory ],
    [ AttachmentStoreToken, repos.observations.attachmentStore ],
    [ StaticIconRepositoryToken, repos.icons.staticIconRepo ],
    [ UserRepositoryToken, repos.users.userRepo ],
    [ FeedsAppServiceTokens.CreateFeed, appLayer.feeds.createFeed ],
    [ FeedsAppServiceTokens.UpdateFeed, appLayer.feeds.updateFeed ],
    [ FeedsAppServiceTokens.DeleteFeed, appLayer.feeds.deleteFeed ],
  ])
  for (const pluginId of config.plugins?.servicePlugins || []) {
    console.info(`loading plugin ${pluginId}...`)
    const pluginScopeServices = new Map<InjectionToken<any>, any>()
    const injectService: InjectableServices = <Service>(token: InjectionToken<Service>) => {
      // TODO: hack for now but could be better
      if (token === PluginStateRepositoryToken) {
        let stateRepo = pluginScopeServices.get(PluginStateRepositoryToken)
        if (!stateRepo) {
          stateRepo = new MongoosePluginStateRepository(pluginId, mongoose)
          pluginScopeServices.set(PluginStateRepositoryToken, stateRepo)
        }
        return stateRepo
      }
      else if (token === MongooseDbConnectionToken) {
        return dbLayer.connectionFactoryForPlugin(pluginId)
      }
      return globalScopeServices.get(token)
    }
    try {
      /*
      TODO: may need to switch to require.resolve() or custom api to load
      modules from a different plugins folder to properly support
      docker/container deployments with a base mage instance image and an
      externally-mounted plugins directory.
      */
      const initPlugin: InitPluginHook = await import(pluginId)
      await integratePluginHooks(pluginId, initPlugin, injectService, collectPluginRoutesToSort)
    }
    catch (err) {
      console.error(`error loading plugin ${pluginId}`, err)
    }
  }
  const pluginRoutePathsDescending = Object.keys(routesForPluginId).sort().reverse()
  for (const pluginId of pluginRoutePathsDescending) {
    addAuthenticatedPluginRoutes(pluginId, routesForPluginId[pluginId])
  }

  try {
    await import('./schedule').then(jobSchedule => jobSchedule.initialize())
  }
  catch (err) {
    throw new Error('error initializing scheduled tasks: ' + err)
  }

  const server = httpLib.createServer(webController)
  service = {
    webController,
    server,
    open(): MageService {
      server.listen(environment.port, environment.address, () => {
        log.info(`MAGE Server listening at address ${environment.address} on port ${environment.port}`)
        webController.emit(MageReadyEvent, service)
      })
      return this
    }
  }
  return service
}

type DatabaseLayer = {
  conn: mongoose.Connection
  connectionFactoryForPlugin: (pluginId: string) => GetDbConnection
  feeds: {
    feedServiceTypeIdentity: FeedServiceTypeIdentityModel
    feedService: FeedServiceModel
    feed: FeedModel
  }
  events: {
    event: MageEventModel
  }
  icons: {
    staticIcon: StaticIconModel
  },
  users: {
    user: UserModel
  },
  settings: {
    setting: SettingsModel
  }
}

type AppLayer = {
  events: {
    addFeedToEvent: eventsApi.AddFeedToEvent
    listEventFeeds: eventsApi.ListEventFeeds
    removeFeedFromEvent: eventsApi.RemoveFeedFromEvent
    fetchFeedContent: feedsApi.FetchFeedContent
  },
  observations: {
    allocateObservationId: observationsApi.AllocateObservationId
    saveObservation: observationsApi.SaveObservation
    storeAttachmentContent: observationsApi.StoreAttachmentContent
    readAttachmentContent: observationsApi.ReadAttachmentContent
  },
  feeds: {
    jsonSchemaService: JsonSchemaService
    permissionService: feedsApi.FeedsPermissionService
    listServiceTypes: feedsApi.ListFeedServiceTypes
    previewTopics: feedsApi.PreviewTopics
    createService: feedsApi.CreateFeedService
    listServices: feedsApi.ListFeedServices
    getService: feedsApi.GetFeedService
    listTopics: feedsApi.ListServiceTopics
    previewFeed: feedsApi.PreviewFeed
    createFeed: feedsApi.CreateFeed
    listAllFeeds: feedsApi.ListAllFeeds
    listServiceFeeds: feedsApi.ListServiceFeeds
    deleteService: feedsApi.DeleteFeedService
    getFeed: feedsApi.GetFeed
    updateFeed: feedsApi.UpdateFeed
    deleteFeed: feedsApi.DeleteFeed
  },
  icons: StaticIconsAppLayer,
  users: UsersAppLayer,
  settings: SettingsAppLayer
}

async function initDatabase(): Promise<DatabaseLayer> {
  const { uri, connectRetryDelay, connectTimeout, options } = environment.mongo
  const conn = await waitForDefaultMongooseConnection(mongoose, uri, connectTimeout, connectRetryDelay, options).then(() => mongoose.connection)
  const PluginConnectionFactory = function PluginConnectionFactory(pluginId: string): GetDbConnection {
    const pluginMongoose = new mongoose.Mongoose()
    // TODO: add event listeners to plugin connections to log how plugins are using the connection
    // TODO: bufferCommands probably exists on mongoose 5+ types. 4 supports the option, but the typedefs don't
    const pluginOptions: mongoose.ConnectionOptions & { bufferCommands: boolean } = {
      ...options,
      // TODO: mongoose 5+ minPoolSize, maxPoolSize
      poolSize: 5,
      bufferCommands: false,
      config: { autoIndex: false },
    }
    return () => {
      console.info(`get db connection for plugin ${pluginId}`)
      return waitForDefaultMongooseConnection(pluginMongoose, uri, connectTimeout, connectRetryDelay, pluginOptions).then(() => pluginMongoose.connection)
    }
  }
  // TODO: transition legacy model initialization
  // TODO: inject connection to migrations
  // TODO: explore performing migrations without mongoose models because current models may not be compatible with past migrations
  require('./models').initializeModels()
  const migrate = await import('./migrate')
  await migrate.runDatabaseMigrations(uri, options)
  return {
    conn,
    connectionFactoryForPlugin: PluginConnectionFactory,
    feeds: {
      feedServiceTypeIdentity: FeedServiceTypeIdentityModel(conn),
      feedService: FeedServiceModel(conn),
      feed: FeedModel(conn)
    },
    events: {
      event: require('./models/event').Model
    },
    icons: {
      staticIcon: StaticIconModel(conn)
    },
    users: {
      user: require('./models/user').Model
    },
    settings: {
      setting: require('./models/setting').Model
    }
  }
}

type Repositories = {
  events: {
    eventRepo: MageEventRepository
  },
  observations: {
    obsRepoFactory: ObservationRepositoryForEvent,
    attachmentStore: AttachmentStore
  }
  feeds: {
    serviceTypeRepo: FeedServiceTypeRepository,
    serviceRepo: FeedServiceRepository,
    feedRepo: FeedRepository
  },
  icons: {
    staticIconRepo: StaticIconRepository
  },
  users: {
    userRepo: UserRepository
  },
  settings: {
    settingRepo: SettingRepository
  }
}

  // TODO: the real thing
const jsonSchemaService: JsonSchemaService = {
  async validateSchema(schema: JSONSchema4): Promise<JsonValidator> {
    return {
      validate: async () => null
    }
  }
}

const DomainEvents = new EventEmitter({ captureRejections: true })
  .on('error', err => {
    console.error('uncaught error in domain event handler:', err)
  })

async function initRepositories(models: DatabaseLayer, config: BootConfig): Promise<Repositories> {
  const serviceTypeRepo = new MongooseFeedServiceTypeRepository(models.feeds.feedServiceTypeIdentity)
  const serviceRepo = new MongooseFeedServiceRepository(models.feeds.feedService)
  const feedRepo = new MongooseFeedRepository(models.feeds.feed, new SimpleIdFactory())
  const eventRepo = new MongooseMageEventRepository(models.events.event)
  const staticIconRepo = new MongooseStaticIconRepository(
    models.icons.staticIcon,
    new SimpleIdFactory(),
    new FileSystemIconContentStore(),
    [ new PluginUrlScheme(config.plugins?.servicePlugins || []) ])
  const userRepo = new MongooseUserRepository(models.users.user)
  const settingRepo = new MongooseSettingsRepository(models.settings.setting)
  const attachmentStore = await intializeAttachmentStore(environment.attachmentBaseDirectory)
  if (attachmentStore instanceof FileSystemAttachmentStoreInitError) {
    throw attachmentStore
  }
  return {
    feeds: {
      serviceTypeRepo, serviceRepo, feedRepo
    },
    events: {
      eventRepo
    },
    observations: {
      obsRepoFactory: createObservationRepositoryFactory(eventRepo, DomainEvents),
      attachmentStore
    },
    icons: {
      staticIconRepo
    },
    users: {
      userRepo
    },
    settings: {
      settingRepo
    }
  }
}

async function initAppLayer(repos: Repositories): Promise<AppLayer> {
  const events = await initEventsAppLayer(repos)
  const observations = await initObservationsAppLayer(repos)
  const icons = await initIconsAppLayer(repos)
  const feeds = await initFeedsAppLayer(repos)
  const users = await initUsersAppLayer(repos)
  const settings = await initSettingsAppLayer(repos)
  return {
    events,
    observations,
    feeds,
    icons,
    users,
    settings
  }
}

async function initUsersAppLayer(repos: Repositories): Promise<AppLayer['users']> {
  const usersPermissions = new RoleBasedUsersPermissionService()
  const searchUsers = SearchUsers(repos.users.userRepo, usersPermissions)
  return {
    searchUsers
  }
}

async function initEventsAppLayer(repos: Repositories): Promise<AppLayer['events']> {
  const eventPermissions = await import('./permissions/permissions.events')
  const eventFeedsPermissions = new eventPermissions.EventFeedsPermissionService(repos.events.eventRepo, eventPermissions.defaultEventPermissionsService)
  return {
    addFeedToEvent: eventsImpl.AddFeedToEvent(eventPermissions.defaultEventPermissionsService, repos.events.eventRepo),
    listEventFeeds: eventsImpl.ListEventFeeds(eventPermissions.defaultEventPermissionsService, repos.events.eventRepo, repos.feeds.feedRepo),
    removeFeedFromEvent: eventsImpl.RemoveFeedFromEvent(eventPermissions.defaultEventPermissionsService, repos.events.eventRepo),
    fetchFeedContent: feedsImpl.FetchFeedContent(eventFeedsPermissions, repos.feeds.serviceTypeRepo, repos.feeds.serviceRepo, repos.feeds.feedRepo, jsonSchemaService)
  }
}

async function initObservationsAppLayer(repos: Repositories): Promise<AppLayer['observations']> {
  const eventPermissions = await import('./permissions/permissions.events')
  const obsPermissions = await import('./permissions/permissions.observations')
  const obsPermissionsService = new obsPermissions.ObservationPermissionsServiceImpl(eventPermissions.defaultEventPermissionsService)
  observationsImpl.registerDeleteRemovedAttachmentsHandler(DomainEvents, repos.observations.attachmentStore)
  return {
    allocateObservationId: observationsImpl.AllocateObservationId(obsPermissionsService),
    saveObservation: observationsImpl.SaveObservation(obsPermissionsService, repos.users.userRepo),
    storeAttachmentContent: observationsImpl.StoreAttachmentContent(obsPermissionsService, repos.observations.attachmentStore),
    readAttachmentContent: observationsImpl.ReadAttachmentContent(obsPermissionsService, repos.observations.attachmentStore)
  }
}

function initIconsAppLayer(repos: Repositories): StaticIconsAppLayer {
  const permissions = new RoleBasedStaticIconPermissionService()
  return {
    getIcon: GetStaticIcon(permissions, repos.icons.staticIconRepo),
    getIconContent: GetStaticIconContent(permissions, repos.icons.staticIconRepo),
    listIcons: ListStaticIcons(permissions)
  }
}

function initFeedsAppLayer(repos: Repositories): AppLayer['feeds'] {
  const { serviceTypeRepo, serviceRepo, feedRepo } = repos.feeds
  const permissionService = new PreFetchedUserRoleFeedsPermissionService()
  const listServiceTypes = feedsImpl.ListFeedServiceTypes(permissionService, serviceTypeRepo)
  const previewTopics = feedsImpl.PreviewTopics(permissionService, serviceTypeRepo)
  const createService = feedsImpl.CreateFeedService(permissionService, serviceTypeRepo, serviceRepo)
  const listServices = feedsImpl.ListFeedServices(permissionService, serviceTypeRepo, serviceRepo)
  const getService = feedsImpl.GetFeedService(permissionService, serviceTypeRepo, serviceRepo)
  const listTopics = feedsImpl.ListServiceTopics(permissionService, serviceTypeRepo, serviceRepo)
  const previewFeed = feedsImpl.PreviewFeed(permissionService, serviceTypeRepo, serviceRepo, jsonSchemaService, repos.icons.staticIconRepo)
  const createFeed = feedsImpl.CreateFeed(permissionService, serviceTypeRepo, serviceRepo, feedRepo, jsonSchemaService, repos.icons.staticIconRepo)
  const listAllFeeds = feedsImpl.ListAllFeeds(permissionService, feedRepo)
  const listServiceFeeds = feedsImpl.ListServiceFeeds(permissionService, serviceRepo, feedRepo)
  const deleteService = feedsImpl.DeleteFeedService(permissionService, serviceRepo, feedRepo, repos.events.eventRepo)
  const getFeed = feedsImpl.GetFeed(permissionService, serviceTypeRepo, serviceRepo, feedRepo)
  const updateFeed = feedsImpl.UpdateFeed(permissionService, serviceTypeRepo, serviceRepo, feedRepo, repos.icons.staticIconRepo)
  const deleteFeed = feedsImpl.DeleteFeed(permissionService, feedRepo, repos.events.eventRepo)
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
    deleteFeed,
  }
}

async function initSettingsAppLayer(repos: Repositories): Promise<AppLayer['settings']> {
  const mapPermissions = new RoleBasedMapPermissionService()
  const getMapSettings = FetchMapSettings(repos.settings.settingRepo, mapPermissions)
  const updateMapSettings = UpdateMapSettings(repos.settings.settingRepo, mapPermissions)
  return {
    getMapSettings,
    updateMapSettings
  }
}

interface MageEventRequestContext extends AppRequestContext<UserDocument> {
  event: MageEventDocument | MageEvent | undefined
}

const observationEventScopeKey = 'observationEventScope' as const

async function initWebLayer(repos: Repositories, app: AppLayer, webUIPlugins: string[]):
  Promise<{ webController: express.Application, addAuthenticatedPluginRoutes: (pluginId: string, pluginRoutes: WebRoutesHooks['webRoutes']) => void }> {
  // load routes the old way
  const webLayer = await import('./express')
  const webController = webLayer.app
  const webAuth = webLayer.auth
  const appRequestFactory: WebAppRequestFactory = <Params>(req: express.Request, params: Params): AppRequest<UserDocument, MageEventRequestContext> & Params => {
    return {
      ...params,
      context: {
        ...baseAppRequestContext(req),
        event: req.event || req.eventEntity
      }
    }
  }
  const bearerAuth = webAuth.passport.authenticate('bearer')

  const settingsRoutes = SettingsRoutes(app.settings, appRequestFactory)
  webController.use('/api/settings', [
    bearerAuth,
    settingsRoutes
  ])

  const usersRoutes = UsersRoutes(app.users, appRequestFactory)
  /*
  TODO: cannot mount at /api/users/search because the /api/users/:userId route
  comes first and catches the request.  when old routes move to new sub-router,
  ensure this and the web client changes appropriately
  */
  webController.use('/api/next-users', [
    bearerAuth,
    usersRoutes
  ])
  const feedsRoutes = FeedsRoutes(app.feeds, appRequestFactory)
  webController.use('/api/feeds', [
    bearerAuth,
    feedsRoutes
  ])
  const iconsRoutes = StaticIconRoutes(app.icons, appRequestFactory)
  webController.use('/api/icons', [
    bearerAuth,
    iconsRoutes
  ])
  const observationRequestFactory: ObservationWebAppRequestFactory = <Params extends object | undefined>(req: express.Request, params: Params) => {
    const context: observationsApi.ObservationRequestContext = {
      ...baseAppRequestContext(req),
      mageEvent: req[observationEventScopeKey]!.mageEvent,
      userId: req.user.id,
      deviceId: req.provisionedDeviceId,
      observationRepository: req[observationEventScopeKey]!.observationRepository
    }
    return { ...params, context }
  }
  const observationsRoutes = ObservationRoutes(app.observations, repos.observations.attachmentStore, observationRequestFactory)
  webController.use(`/api/events/:${observationEventScopeKey}/observations`, [
    bearerAuth,
    ensureObservationEventScope(repos.events.eventRepo, repos.observations.obsRepoFactory),
    observationsRoutes
  ])
  const eventFeedsRoutes = EventFeedsRoutes({ ...app.events, eventRepo: repos.events.eventRepo }, appRequestFactory)
  webController.use('/api/events', [
    bearerAuth,
    eventFeedsRoutes
  ])

  /*
  no /api prefix here, because this is not really part of the service api. the
  only reason this is here is because there is currently no clean way to apply
  authentication outside of this service main module. an ideal clean
  architecture would decouple the authentication services from this service
  module and its express/passport middleware, but that will require a larger
  effort to refactor.
  */
  const webUiPluginRoutes = WebUIPluginRoutes(webUIPlugins)
  webController.use('/ui_plugins', [
    bearerAuth,
    webUiPluginRoutes
  ])
  /*
   TODO: maybe a better approach would be to setup a global root middleware
   that creates the app request context for every incoming http request and
   sets a property on the express/node http request object
   */
  const pluginAppRequestContext: GetAppRequestContext = (req: express.Request) => {
    return {
      requestToken: Symbol(),
      requestingPrincipal() {
        /*
        TODO: this should ideally change so that the existing passport login
        middleware applies the entity form of a user on the request rather than
        the mongoose document instance
        */
        return { ...req.user.toJSON(), id: req.user._id.toHexString() } as UserExpanded
      },
      locale() {
        return Object.freeze({
          languagePreferences: parseAcceptLanguageHeader(req.headers['accept-language'])
        })
      }
    }
  }
  try {
    const webappPackagePath = require.resolve('@ngageoint/mage.web-app/package.json')
    const webappDir = path.dirname(webappPackagePath)
    webController.use(express.static(webappDir))
  }
  catch (err) {
    console.warn('failed to load mage web app package', err)
  }
  return {
    webController,
    addAuthenticatedPluginRoutes: (pluginId: string, initPluginRoutes: WebRoutesHooks['webRoutes']) => {
      const routes = initPluginRoutes(pluginAppRequestContext)
      webController.use(`/plugins/${pluginId}`, [ bearerAuth, routes ])
    }
  }
}

function baseAppRequestContext(req: express.Request): AppRequestContext<UserWithRole> {
  return {
    requestToken: Symbol(),
    requestingPrincipal() {
      return req.user as UserWithRole
    },
    locale() {
      return Object.freeze({
        languagePreferences: parseAcceptLanguageHeader(req.headers['accept-language'])
      })
    }
  }
}

function ensureObservationEventScope(eventRepo: MageEventRepository, createObsRepo: ObservationRepositoryForEvent) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const eventIdFromPath = req.params[observationEventScopeKey]
    const eventId: MageEventId = parseInt(eventIdFromPath)
    const mageEvent = Number.isInteger(eventId) ? await eventRepo.findById(eventId) : null
    if (mageEvent) {
      const observationRepository = await createObsRepo(mageEvent.id)
      req[observationEventScopeKey] = { mageEvent, observationRepository }
      return next()
    }
    res.status(404).json(`event not found: ${eventIdFromPath}`)
  }
}

declare module 'express' {
  interface Request {
    [observationEventScopeKey]?: {
      mageEvent: MageEvent,
      observationRepository: EventScopedObservationRepository
    }
  }
}
