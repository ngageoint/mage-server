
import { URL } from 'url'
import express from 'express'
import { ErrEntityNotFound } from '../../app.api/app.api.errors'
import { GetStaticIcon, GetStaticIconContent, GetStaticIconContentRequest, GetStaticIconRequest, ListStaticIcons, ListStaticIconsRequest } from '../../app.api/icons/app.api.icons'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { PagingParameters } from '../../entities/entities.global'
import { StaticIcon } from '../../entities/icons/entities.icons'

export interface StaticIconsAppLayer {
  getIcon: GetStaticIcon
  listIcons: ListStaticIcons
  getIconContent: GetStaticIconContent
}

function addContentPathToIcon(req: express.Request, icon: StaticIcon): StaticIcon & { contentPath: string } {
  return {
    ...icon,
    contentPath: `${req.baseUrl}/${icon.id}/content`
  }
}

export function StaticIconRoutes(appLayer: StaticIconsAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/:iconId/content')
    .get(async (req, res, next) => {
      const iconId = req.params.iconId
      const appReq: GetStaticIconContentRequest = createAppRequest(req, { iconId })
      const appRes = await appLayer.getIconContent(appReq)
      if (appRes.success) {
        const { iconInfo: icon, iconContent: content } = appRes.success
        if (typeof icon.mediaType === 'string') {
          res.type(icon.mediaType)
        }
        const oneYearInSeconds = 365 * 24 * 60 * 60
        const etag = `${icon.id}.${icon.contentHash || icon.resolvedTimestamp}`
        return content.pipe(res
          .header('cache-control', `private; max-age=${oneYearInSeconds}`)
          // TODO: need app layer support for this
          // .header('etag', etag)
          .status(200))
      }
      next(appRes.error)
    })

  routes.route('/:iconId')
    .get(async (req, res, next) => {
      const iconId = req.params.iconId
      const appReq: GetStaticIconRequest = createAppRequest(req, { iconRef: { id: iconId }})
      const appRes = await appLayer.getIcon(appReq)
      if (appRes.success) {
        return res.json(addContentPathToIcon(req, appRes.success))
      }
      if (appRes.error?.code === ErrEntityNotFound) {
        return res.status(404).json(`icon not found: ${iconId}`)
      }
      next(appRes.error)
    })

  routes.route('/')
    .get(
      async (req, res, next) => {
        const sourceUrlParam = req.query['source_url']
        if (!sourceUrlParam) {
          return next()
        }
        let sourceUrl: URL | null = null
        if (typeof sourceUrlParam === 'string') {
          try {
            sourceUrl = new URL(sourceUrlParam)
          }
          catch (err) {
            console.error(`error parsing url parameter: ${sourceUrlParam}`, err)
          }
        }
        if (!sourceUrl) {
          return res.status(400).json(`invalid icon source url: ${sourceUrlParam}`)
        }
        const appReq: GetStaticIconRequest = createAppRequest(req, { iconRef: { sourceUrl }})
        const appRes = await appLayer.getIcon(appReq)
        if (appRes.success) {
          return res.json(addContentPathToIcon(req, appRes.success))
        }
        if (appRes.error?.code === ErrEntityNotFound) {
          return res.json(null)
        }
        next(appRes.error)
      },
      async (req, res, next) => {
        const pageSize = parseInt(String(req.query.page_size))
        const pageIndex = parseInt(String(req.query.page))
        let paging: Partial<PagingParameters> = {}
        if (typeof pageSize === 'number' && !Number.isNaN(pageSize)) {
          paging.pageSize = pageSize
        }
        if (typeof pageIndex === 'number' && !Number.isNaN(pageIndex)) {
          paging.pageIndex = pageIndex
        }
        const searchText = typeof req.query.search === 'string' ? req.query.search : null
        const listParams: any = {}
        if (Object.getOwnPropertyNames(paging).length) {
          listParams.paging = paging
        }
        if (searchText) {
          listParams.searchText = searchText
        }
        const appReq: ListStaticIconsRequest = createAppRequest(req, listParams)
        const appRes = await appLayer.listIcons(appReq)
        if (appRes.success) {
          const icons = appRes.success.items
          const iconsWithContentPath = icons.map(x => addContentPathToIcon(req, x))
          return res.json({ ...appRes.success, items: iconsWithContentPath })
        }
        next(appRes.error)
      }
    )

  routes.use(compatibilityMageAppErrorHandler)

  return routes
}