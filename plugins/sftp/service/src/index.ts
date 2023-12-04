import { UserRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.users'
import { SFTPPluginConfig } from './SFTPPluginConfig'
import { ObservationProcessor } from './ObservationProcessor'
import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { AttachmentStoreToken, ObservationRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import express from 'express'

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
  stateRepo: PluginStateRepositoryToken,
  eventRepo: MageEventRepositoryToken,
  observationRepoForEvent: ObservationRepositoryToken,
  userRepo: UserRepositoryToken,
  attachmentStore: AttachmentStoreToken,
}

/**
 * The MAGE SFTP Plugin finds new MAGE observations and if enabled will send observations
 * to an SFTP endpoint.
 */
const sftpPluginHooks: InitPluginHook<typeof InjectedServices> = {
  inject: {
    stateRepo: PluginStateRepositoryToken,
    eventRepo: MageEventRepositoryToken,
    observationRepoForEvent: ObservationRepositoryToken,
    userRepo: UserRepositoryToken,
    attachmentStore: AttachmentStoreToken,
  },
  init: async (services): Promise<WebRoutesHooks> => {
    console.info('Intializing SFTP plugin...')
    const { stateRepo, eventRepo, observationRepoForEvent, userRepo, attachmentStore } = services
    const processor = new ObservationProcessor(stateRepo, eventRepo, observationRepoForEvent, userRepo, attachmentStore, console);
    processor.start();
    return {
      webRoutes(requestContext: GetAppRequestContext): express.Router {
        // TODO hook into the mage.service permissions?
        const router: express.Router = express.Router()
          .use(express.json())
          .use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const context = requestContext(req)
            const user = context.requestingPrincipal()
            if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
              return res.sendStatus(403)
            }
            next()
          })

        router.route('/configuration')
          .get(async (_req, res, _next) => {
            console.info('Getting SFTP plugin config...')
            const config = await processor.getConfiguration();
            res.json(config)
          })
          .post(async (req, res, _next) => {
            console.info('Applying SFTP plugin config...')
            const configuration = req.body as SFTPPluginConfig
            processor.updateConfiguration(configuration)
            res.status(200).json(configuration)
          })

        return router
      }
    }
  }
}

export = sftpPluginHooks