
import express from 'express'
import { CreateExport, CreateExportRequest, DeleteExport, DeleteExportRequest, ExportRequest, GetExportContent, GetExportContentRequest, GetExports, GetExportsRequest } from '../../app.api/exports/app.api.exports'
import moment from 'moment'
import { invalidInput } from '../../app.api/app.api.errors'
import { Export, EXPORT_FORMATS, ExportCreateParams, ExportFormat } from '../../entities/exports/entities.exports'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { compatibilityMageAppErrorHandler, mageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { AppRequest } from '../../app.api/app.api.global'

export interface ExportAppLayer {
  getExports: GetExports,
  getExportContent: GetExportContent
  createExport: CreateExport
  deleteExport: DeleteExport
}

export function MyExportRoutes(appLayer: ExportAppLayer, createAppRequest: WebAppRequestFactory<AppRequest<UserWithRole>>): express.Router {

  const routes = express.Router()

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq: GetExportsRequest = createAppRequest(req)

      const appRes = await appLayer.getExports(appReq)
      if (appRes.success) {
        const response = appRes.success.map(e => { return { ...jsonForExport(e, qualifiedBaseUrl(req))}})
        return res.json(response)
      }
      next(appRes.error)
    })

  routes.route('/:exportId')
    .get(async (req, res, next) => {
      const appReq = createAppRequest<Omit<GetExportContentRequest, 'context'>>(req, {
        exportId: req.params.exportId
      })

      const appRes = await appLayer.getExportContent(appReq)
      if (appRes.error) {
        return next(appRes.error)
      }
      const content = appRes.success
      if (!content) {
        return res.status(500).json({ message: 'unknown application response' })
      }

      const headers = {
        'content-type': 'application/zip',
        ...(content.export.size && { 'content-length': content.export.size })
      } as any

      return content.bytes.pipe(res.writeHead(200, headers))
    })
    .delete(async (req, res, next) => {
      const appReq = createAppRequest<Omit<DeleteExportRequest, 'context'>>(req, {
        exportId: req.params.exportId
      })

      const appRes = await appLayer.deleteExport(appReq)
      if (appRes.success) {
        return res.sendStatus(204)
      }
      next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)

  return routes
}

export interface ExportWebAppRequestFactory {
  <Params extends object>(req: express.Request, params?: Params): Params & Omit<ExportRequest, 'params'>
}

export function ExportRoutes(appLayer: ExportAppLayer, createAppRequest: ExportWebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/')
    .post(async (req, res, next) => {
      const {
        format,
        observations: exportObservations,
        locations: exportLocations,
        startDate: iso8601StartDate,
        endDate: iso8601EndDate,
        includeAttachments = true,
        favorites,
        important,
        projection
      } = req.body

      if (!format) {
        return next(invalidInput('invalid request', [ 'missing', 'format' ]))
      }

      if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
        return next(invalidInput('invalid format', [ `format must be of type ${EXPORT_FORMATS.join(' or ')}`, 'format' ]))
      }

      let startDate: Date | undefined
      if (iso8601StartDate) {
        startDate = parseISO8601(iso8601StartDate)
        if (!startDate) {
          return next(invalidInput('Export startDate must be a valid ISO-8601 date.', [ 'startDate' ]))
        }
      }

      let endDate: Date | undefined
      if (iso8601EndDate) {
        endDate = parseISO8601(iso8601EndDate)
        if (!endDate) {
          return next(invalidInput('Export endDate must be a valid ISO-8601 date.', [ 'endDate' ]))
        }
      }

      const params: ExportCreateParams = {
        format: format as ExportFormat,
        filter: {
          exportObservations,
          exportLocations,
          includeAttachments,
          favorites,
          important,
          startDate,
          endDate
        },
        projection
      }

      const appReq: CreateExportRequest<UserWithRole> = createAppRequest<Omit<CreateExportRequest, 'context'>>(req, params)
      const appRes = await appLayer.createExport(appReq)
      if (appRes.success) {
        const response = jsonForExport(appRes.success, qualifiedBaseUrl(req))
        return res.json(response)
      }
      next(appRes.error)
    })

  routes.use(mageAppErrorHandler)

  return routes
}

function qualifiedBaseUrl(req: express.Request): string {
  return req.getRoot()
}

export function jsonForExport(e: Export, baseUrl: string): Export & { url: string } {
  return { ...e, url: `${baseUrl}/api/exports/mine/${e.id}`}
}

function parseISO8601(iso8601: string): Date | undefined {
  const endMoment = moment(iso8601, moment.ISO_8601, true)
  if (typeof iso8601 === 'string' || endMoment.isValid()) {
    return endMoment.toDate()
  }
}
