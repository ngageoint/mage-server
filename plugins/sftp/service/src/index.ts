import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SFTPPluginConfig } from './configuration/SFTPPluginConfig'
import { SftpController } from './controller/controller'
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
      value: (...args: any[]) => {
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

    const { getDbConnection } = services
    const dbConnection: mongoose.Connection = await getDbConnection();

    const controller = new SftpController(
      console,
      services,
      dbConnection
    );

    controller.start();

    return {
      webRoutes: {
        protected: (requestContext: GetAppRequestContext) => {
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

                const status = controller.getStatus()
                if (status.lastError) {
                  res.status(200).json({
                    success: false,
                    message: status.lastError,
                    configuration
                  })
                } else {
                  res.status(200).json({
                    success: true,
                    message: 'Configuration saved successfully',
                    configuration
                  })
                }
              } catch (error) {
                console.error('Error updating configuration:', error)
                res.status(500).json({
                  success: false,
                  message: error instanceof Error ? error.message : 'Failed to save configuration'
                })
              }
            })

          routes.route('/test-connection')
            .post(async (req, res, _next) => {
              try {
                const result = await controller.testConnection(req.body)
                res.json(result)
              } catch (error) {
                console.error('Error testing connection:', error)
                res.status(500).json({
                  success: false,
                  message: error instanceof Error ? error.message : 'Connection test failed'
                })
              }
            })

          routes.route('/status')
            .get(async (_req, res, _next) => {
              try {
                const status = controller.getStatus()
                res.json(status)
              } catch (error) {
                console.error('Error getting status:', error)
                res.status(500).json({
                  connected: false,
                  lastError: error instanceof Error ? error.message : 'Failed to get status'
                })
              }
            })

          return routes
        }
      }
    }
  }
}

export = sftpPluginHooks