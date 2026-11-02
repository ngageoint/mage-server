
import express from 'express'
import mongoose from 'mongoose'
import { FeedServiceType } from '@ngageoint/mage.service/lib/entities/feeds/entities.feeds'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { InitPluginHook } from '@ngageoint/mage.service/lib/plugins.api'
import { FeedsPluginHooks, FeedRepositoryToken, FeedServiceRepositoryToken, FeedServiceTypeRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.feeds'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { MongooseDbConnectionToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import * as TAK from './tak'
import { AxiosTakTransport } from './transport.axios'
import { TakPushModel, MongooseTakPushRepository } from './adapters/tak-push.mongoose'
import { TakPushSettingsModel, MongooseTakPushSettingsRepository } from './adapters/tak-push-settings.mongoose'
import { TakPushController } from './push/controller'
import { TakLocationPushController } from './push/location-controller'
import { createTakConnectionResolver, createTakSendTargetResolver } from './push/resolve-connection'
import { UserLocationSavedDomainEvent } from './entities/user-location'

const { name: packageName } = require('../package.json')

const transport = new AxiosTakTransport()

// `MageEventsPluginHooks` isn't imported from @ngageoint/mage.service here -
// see entities/user-location.ts for why; this shape is what the real running
// server (service/src's loadMageEventsHoooks) actually checks for.
interface TakMageEventHooks {
  mageEvent?: {
    onUserLocations?: (event: UserLocationSavedDomainEvent) => any
  }
}

const InjectedServices = {
  mageEventRepository: MageEventRepositoryToken,
  feedRepository: FeedRepositoryToken,
  feedServiceRepository: FeedServiceRepositoryToken,
  feedServiceTypeRepository: FeedServiceTypeRepositoryToken,
  observationRepositoryForEvent: ObservationRepositoryToken,
  userRepository: UserRepositoryToken,
  getDbConnection: MongooseDbConnectionToken
}

const hooks: InitPluginHook<typeof InjectedServices> = {
  inject: InjectedServices,
  async init(services): Promise<FeedsPluginHooks & WebRoutesHooks & TakMageEventHooks> {
    const {
      mageEventRepository,
      feedRepository,
      feedServiceRepository,
      feedServiceTypeRepository,
      observationRepositoryForEvent,
      userRepository,
      getDbConnection
    } = services
    const dbConnection: mongoose.Connection = await getDbConnection()

    const settingsRepository = new MongooseTakPushSettingsRepository(
      TakPushSettingsModel(dbConnection, `${packageName}/push-settings`)
    )
    const trackingRepository = new MongooseTakPushRepository(
      TakPushModel(dbConnection, `${packageName}/push`)
    )

    const resolveConnection = createTakConnectionResolver(
      mageEventRepository,
      feedRepository,
      feedServiceRepository,
      feedServiceTypeRepository
    )
    const resolveSendTarget = createTakSendTargetResolver(resolveConnection)
    const pushController = new TakPushController(
      resolveSendTarget,
      observationRepositoryForEvent,
      settingsRepository,
      trackingRepository
    )
    // start() guards its own polling loop internally, but this is a
    // fire-and-forget call at plugin boot with nothing else to catch a
    // rejection - never let a startup failure here crash the server.
    pushController.start().catch(err => console.error('tak push: failed to start polling', err))

    const locationPushController = new TakLocationPushController(
      resolveSendTarget,
      settingsRepository,
      userRepository
    )

    return {
      mageEvent: {
        // Registered directly as a core EventEmitter listener - handleLocationsSaved
        // never rejects on its own, but `.catch()` here is defense in depth
        // (same lesson as pushController.start() above).
        onUserLocations: (event: UserLocationSavedDomainEvent) =>
          locationPushController.handleLocationsSaved(event)
            .catch(err => console.error('tak push: failed handling user locations', err))
      },
      feeds: {
        async loadServiceTypes(): Promise<FeedServiceType[]> {
          return [
            new TAK.TakServerServiceType(transport)
          ]
        }
      },
      webRoutes: {
        protected: (requestContext: GetAppRequestContext): express.Router => {
          const routes = express.Router()
            .use(express.json())
            .use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
              const context = requestContext(req)
              const user = context.requestingPrincipal()
              if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
                return res.sendStatus(403)
              }
              next()
            })

          routes.route('/settings')
            .get(async (req, res) => {
              const eventId = parseInt(req.query['eventId'] as string)
              if (isNaN(eventId)) {
                return res.status(400).json({ error: 'eventId query param is required' })
              }
              const status = await pushController.findPushStatusForEvent(eventId)
              res.json(status)
            })
            .post(async (req, res) => {
              const { eventId, enabled, locationSharingEnabled } = req.body
              const hasEnabled = typeof enabled === 'boolean'
              const hasLocationSharingEnabled = typeof locationSharingEnabled === 'boolean'
              if (typeof eventId !== 'number' || (!hasEnabled && !hasLocationSharingEnabled)) {
                return res.status(400).json({ error: 'eventId (number) and at least one of enabled/locationSharingEnabled (boolean) are required' })
              }
              if (hasEnabled) {
                await pushController.setEnabled(eventId, enabled)
              }
              if (hasLocationSharingEnabled) {
                await pushController.setLocationSharingEnabled(eventId, locationSharingEnabled)
              }
              const status = await pushController.findPushStatusForEvent(eventId)
              res.json(status)
            })

          return routes
        }
      }
    }
  }
}

export = hooks
