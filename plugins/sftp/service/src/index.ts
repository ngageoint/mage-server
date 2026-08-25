import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SFTPPluginConfig } from './configuration/SFTPPluginConfig'
import { SftpController } from './controller/controller'
import { SftpStatus } from './adapters/adapters.sftp.mongoose'
import { MongooseDbConnectionToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { AttachmentStoreToken, ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import express from 'express'
import mongoose from 'mongoose';

const logPrefix = '[mage.sftp]'
const logMethods = ['log', 'debug', 'info', 'warn', 'error'] as const
const consoleOverrides = logMethods.reduce((overrides, fn) => {
  return {
    ...overrides,
    [fn]: {
      writable: false,
      value: (...args: unknown[]) => {
        globalThis.console[fn](new Date().toISOString(), '-', logPrefix, ...args)
      }
    }
  } as PropertyDescriptorMap
}, {} as PropertyDescriptorMap)
const console = Object.create(globalThis.console, consoleOverrides) as Console

const InjectedServices = {
  stateRepository: PluginStateRepositoryToken,
  eventRepository: MageEventRepositoryToken,
  observationRepository: ObservationRepositoryToken,
  userRepository: UserRepositoryToken,
  attachmentStore: AttachmentStoreToken,
  getDbConnection: MongooseDbConnectionToken
}

/**
 * The MAGE SFTP Plugin finds new MAGE observations and if enabled will send observations
 * to an SFTP endpoint.
 */
const sftpPluginHooks: InitPluginHook<typeof InjectedServices> = {
  inject: {
    stateRepository: PluginStateRepositoryToken,
    eventRepository: MageEventRepositoryToken,
    observationRepository: ObservationRepositoryToken,
    userRepository: UserRepositoryToken,
    attachmentStore: AttachmentStoreToken,
    getDbConnection: MongooseDbConnectionToken
  },
  init: async (services): Promise<WebRoutesHooks> => {
    console.info('intializing sftp plugin')

    const { stateRepository, eventRepository, observationRepository, userRepository, attachmentStore, getDbConnection } = services
    const dbConnection: mongoose.Connection = await getDbConnection();

    const controller = new SftpController(
      console,
      stateRepository,
      eventRepository,
      observationRepository,
      userRepository,
      attachmentStore,
      dbConnection
    );

    controller.start();

    return {
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

          routes.route('/configuration')
            .get(async (_req, res, _next) => {
              const config = await controller.getConfiguration();
              res.json(config);
            })
            .post(async (req, res, _next) => {
              try {
                await controller.stop()
                const configuration = req.body as SFTPPluginConfig
                await controller.updateConfiguration(configuration)
                await controller.start()
                res.status(200).json(configuration)
              } catch (error) {
                console.error('Error updating configuration:', error)
                res.status(500).send(error instanceof Error ? error.message : 'Failed to save configuration')
              }
            })

          routes.route('/private-key')
            .post(async (req, res, _next) => {
              try {
                const { privateKey } = req.body
                if (!privateKey || typeof privateKey !== 'string') {
                  return res.status(400).send('Private key text is required')
                }

                const trimmedKey = privateKey.trim()
                if (!trimmedKey.includes('PRIVATE KEY')) {
                  return res.status(400).send('The provided text does not appear to be a valid private key.')
                }

                controller.savePrivateKey(trimmedKey)

                res.status(200).json({})
              } catch (error) {
                console.error('Error saving private key:', error)
                res.status(500).send(error instanceof Error ? error.message : 'Failed to save private key')
              }
            })

          routes.route('/reset')
            .post(async (_req, res, _next) => {
              try {
                await controller.resetToDefaults()
                const config = await controller.getConfiguration()
                res.json(config)
              } catch (error) {
                console.error('Error resetting plugin:', error)
                res.status(500).send(error instanceof Error ? error.message : 'Failed to reset plugin')
              }
            })

          routes.route('/test-connection')
            .post(async (req, res, _next) => {
              try {
                const result = await controller.testConnection(req.body)
                res.json(result)
              } catch (error) {
                console.error('Error testing connection:', error)
                res.status(500).send(error instanceof Error ? error.message : 'Connection test failed')
              }
            })

          routes.route('/events')
            .get(async (_req, res, _next) => {
              try {
                const events = await controller.getActiveEvents()
                res.json(events)
              } catch (error) {
                console.error('Error getting events:', error)
                res.sendStatus(500)
              }
            })

          routes.route('/observations/summary')
            .get(async (_req, res, _next) => {
              try {
                const summary = await controller.getObservationStatusSummary()
                res.json(summary)
              } catch (error) {
                console.error('Error getting observation status summary:', error)
                res.sendStatus(500)
              }
            })

          routes.route('/observations')
            .get(async (req, res, _next) => {
              try {
                const eventId = parseInt(req.query['eventId'] as string)
                if (isNaN(eventId)) {
                  return res.status(400).json({ error: 'eventId query param is required' })
                }
                const statusParam = req.query['status'] as string | undefined
                const statusFilter = statusParam
                  ? statusParam.split(',').filter((s): s is SftpStatus => Object.values(SftpStatus).includes(s as SftpStatus))
                  : undefined
                const result = await controller.getObservationStatuses(eventId, statusFilter)
                res.json(result)
              } catch (error) {
                console.error('Error getting observation statuses:', error)
                res.status(500).json({ records: [], counts: {} })
              }
            })

          routes.route('/observations/sync')
            .post(async (req, res, _next) => {
              try {
                const { eventId, observationIds } = req.body
                if (!eventId || !Array.isArray(observationIds)) {
                  return res.status(400).json({ error: 'eventId and observationIds[] are required' })
                }
                await controller.requeueObservations(eventId, observationIds)
                res.json({ queued: observationIds.length })
              } catch (error) {
                console.error('Error requeueing observations:', error)
                res.status(500).json({ queued: 0 })
              }
            })

          return routes
        }
      }
    }
  }
}

export = sftpPluginHooks