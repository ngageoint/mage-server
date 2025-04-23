import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SFTPPluginConfig } from './configuration/SFTPPluginConfig'
import { SftpController } from './controller/controller'
import { MongooseDbConnectionToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { AttachmentStoreToken, ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { MongooseSftpObservationRepository, SftpObservationModel } from './adapters/adapters.sftp.mongoose'
import { MongooseTeamsRepository, TeamModel } from './adapters/adapters.sftp.teams';
import express from 'express'
import mongoose from 'mongoose'
import SFTPClient from 'ssh2-sftp-client';
import { ArchiverFactory } from './format/entities.format'

const { name: packageName } = require('../package.json')

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

    const {
      stateRepository,
      eventRepository,
      observationRepository,
      userRepository,
      attachmentStore,
      getDbConnection
    } = services

    const dbConnection: mongoose.Connection = await getDbConnection()
    const sftpObservationModel = SftpObservationModel(dbConnection, `${packageName}/observations`)
    const sftpObservationRepository = new MongooseSftpObservationRepository(sftpObservationModel)
    const teamModel = TeamModel(dbConnection, `${packageName}/teams`)
    const teamRepo = new MongooseTeamsRepository(teamModel)
    const archiverFactory = new ArchiverFactory(userRepository, attachmentStore)

    const controller = new SftpController(
      stateRepository,
      eventRepository,
      observationRepository,
      sftpObservationRepository,
      new SFTPClient(),
      archiverFactory,
      console,
      teamRepo
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
              await controller.stop()

              const configuration = req.body as SFTPPluginConfig
              await controller.updateConfiguration(configuration)

              await controller.start()

              res.status(200)
            })

          return routes
        }
      }
    }
  }
}

export = sftpPluginHooks