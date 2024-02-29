import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken, AttachmentStoreToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { MongooseDbConnectionToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { ImagePluginConfig, createImagePluginControl } from './processor'
import express from 'express'
import { FindUnprocessedAttachments } from './adapters.db.mongo'
import { SharpImageService } from './adapters.images.sharp'

const logPrefix = '[mage.image]'
const logMethods = [ 'log', 'debug', 'info', 'warn', 'error' ] as const
const consoleOverrides = logMethods.reduce((overrides, fn) => {
  return {
    ...overrides,
    [fn]: {
      writable: false,
      value: (...args: any[]): void => {
        globalThis.console[fn](new Date().toISOString(), '-', logPrefix, ...args)
      }
    }
  } as PropertyDescriptorMap
}, {} as PropertyDescriptorMap)
const console = Object.create(globalThis.console, consoleOverrides) as Console

const InjectedServices = {
  stateRepo: PluginStateRepositoryToken,
  eventRepo: MageEventRepositoryToken,
  obsRepoForEvent: ObservationRepositoryToken,
  attachmentStore: AttachmentStoreToken,
  getDbConn: MongooseDbConnectionToken
}

/**
 * The MAGE Image Plugin finds images attached to MAGE observations, generates
 * thumbnail previews at configurable sizes, and optionally auto-orients the
 * images by rotating them based on the EXIF orientation tag so all clients
 * display the images correctly.
 */
const imagePluginHooks: InitPluginHook<typeof InjectedServices> = {
  inject: {
    stateRepo: PluginStateRepositoryToken,
    eventRepo: MageEventRepositoryToken,
    obsRepoForEvent: ObservationRepositoryToken,
    attachmentStore: AttachmentStoreToken,
    getDbConn: MongooseDbConnectionToken,
  },
  init: async (services): Promise<WebRoutesHooks> => {
    console.info('intializing image plugin ...')
    const { stateRepo, eventRepo, obsRepoForEvent, attachmentStore, getDbConn } = services
    const queryAttachments = FindUnprocessedAttachments(getDbConn, console)
    const imageService = SharpImageService()
    const control = await createImagePluginControl(stateRepo, eventRepo, obsRepoForEvent, attachmentStore, queryAttachments, imageService, console)
    control.start()
    return {
      webRoutes(requestContext: GetAppRequestContext): express.Router {
        // TODO: add api routes to save image processing settings
        const routes = express.Router()
          .use(express.json())
          .use(async (req, res, next) => {
            const context = requestContext(req)
            const user = context.requestingPrincipal()
            if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
              return res.status(403).json({ message: 'unauthorized' })
            }
            next()
          })
        routes.route('/config')
          .get(async (req, res, next) => {
            const config = await control.getConfig()
            res.json(config)
          })
          .put(async (req, res, next) => {
            const bodyConfig = req.body as any
            const configPatch: Partial<ImagePluginConfig> = {
              enabled: typeof bodyConfig.enabled === 'boolean' ? bodyConfig.enabled : undefined,
              intervalBatchSize: typeof bodyConfig.intervalBatchSize === 'number' ? bodyConfig.intervalBatchSize : undefined,
              intervalSeconds: typeof bodyConfig.intervalSeconds === 'number' ? bodyConfig.intervalSeconds : undefined,
              thumbnailSizes: Array.isArray(bodyConfig.thumbnailSizes) ?
                bodyConfig.thumbnailSizes.reduce((sizes: number[], size: any) => {
                  return typeof size === 'number' ? [ ...sizes, size ] : sizes
                }, [] as number[])
                : []
            }
            const config = await control.applyConfig(configPatch)
            res.json(config)
          })
        return routes
      }
    }
  }
}

export = imagePluginHooks

