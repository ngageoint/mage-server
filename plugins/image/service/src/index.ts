import { InitPluginHook, PluginStateRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api'
import { GetAppRequestContext, WebRoutesHooks } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.web'
import { ObservationRepositoryToken, AttachmentStoreToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.observations'
import { MageEventRepositoryToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.events'
import { MongooseDbConnectionToken } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { SettingPermission } from '@ngageoint/mage.service/lib/entities/authorization/entities.permissions'
import { initFromSavedState } from './processor'
import express from 'express'
import { FindUnprocessedAttachments } from './adapters.db.mongo'
import { SharpImageService } from './adapters.images.sharp'

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
    const queryAttachments = FindUnprocessedAttachments(getDbConn)
    const imageService = SharpImageService()
    initFromSavedState(stateRepo, eventRepo, obsRepoForEvent, attachmentStore, queryAttachments, imageService)
    return {
      webRoutes(requestContext: GetAppRequestContext): express.Router {
        return express.Router()
          .use(async (req, res, next) => {
            const context = requestContext(req)
            const user = context.requestingPrincipal()
            if (!user.role.permissions.find(x => x === SettingPermission.UPDATE_SETTINGS)) {
              return res.status(403).json({ message: 'unauthorized' })
            }
          })
      }
    }
  }
}

export = imagePluginHooks
