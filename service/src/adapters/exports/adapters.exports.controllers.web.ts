
import express from 'express'
import {
  CreateExport, CreateExportRequest, DeleteExport, DeleteExportRequest,
  ExportCreateParams, ExportRequest, GetExportContent, GetExportContentRequest, GetExports, GetExportsRequest
} from '../../app.api/exports/app.api.exports'
import { parseConditionFilter } from '../../app.api/observations/app.api.observations'
import { invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { Export, EXPORT_FORMATS, ExportFormat } from '../../entities/exports/entities.exports'
import { ObservationFieldFilter } from '../../entities/observations/entities.observations'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { compatibilityMageAppErrorHandler, mageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { parseISO8601 } from '../../utilities/dates'
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
      const params = parseExportCreateParams(req.body)
      if (params instanceof MageError) {
        return next(params)
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

function parseExportCreateParams(body: any): ExportCreateParams | InvalidInputError {
  const { format, observations, locations } = body

  if (!format) {
    return invalidInput('invalid request', [ 'missing', 'format' ])
  }

  if (!EXPORT_FORMATS.includes(format as ExportFormat)) {
    return invalidInput('invalid format', [ `format must be of type ${EXPORT_FORMATS.join(' or ')}`, 'format' ])
  }

  const filter: ExportCreateParams['filter'] = {}

  if (observations) {
    const parsedObservations = parseExportObservationFilter(observations)
    if (parsedObservations instanceof MageError) return parsedObservations
    filter.observations = parsedObservations
  }

  if (locations) {
    const parsedLocations = parseExportLocationFilter(locations)
    if (parsedLocations instanceof MageError) return parsedLocations
    filter.locations = parsedLocations
  }

  return {
    format: format as ExportFormat,
    filter
  }
}

function parseExportObservationFilter(body: any): ExportCreateParams['filter']['observations'] | InvalidInputError {
  const {
    startDate: iso8601StartDate,
    endDate: iso8601EndDate,
    includeAttachments = true,
    favorites,
    important,
    users,
    teams,
    hasAttachments,
    keyword,
    condition,
    projection
  } = body

  const startDate = parseExportDate(iso8601StartDate, 'observations.startDate')
  if (startDate instanceof MageError) return startDate

  const endDate = parseExportDate(iso8601EndDate, 'observations.endDate')
  if (endDate instanceof MageError) return endDate

  let fieldFilter: ObservationFieldFilter | undefined
  if (typeof keyword === 'string' && keyword.length) {
    fieldFilter = { keyword }
  } else if (condition) {
    const parsedCondition = parseConditionFilter(condition)
    if (parsedCondition) {
      fieldFilter = { condition: parsedCondition }
    }
  }

  return {
    startDate,
    endDate,
    includeAttachments,
    favorites,
    important,
    userIsAnyOf: Array.isArray(users) ? users : undefined,
    teamIsAnyOf: Array.isArray(teams) ? teams : undefined,
    hasAttachments: hasAttachments || undefined,
    fieldFilter,
    projection: Array.isArray(projection) ? projection : undefined
  }
}

function parseExportLocationFilter(body: any): ExportCreateParams['filter']['locations'] | InvalidInputError {
  const {
    startDate: iso8601StartDate,
    endDate: iso8601EndDate,
    users,
    teams
  } = body

  const startDate = parseExportDate(iso8601StartDate, 'locations.startDate')
  if (startDate instanceof MageError) return startDate

  const endDate = parseExportDate(iso8601EndDate, 'locations.endDate')
  if (endDate instanceof MageError) return endDate

  return {
    startDate,
    endDate,
    userIsAnyOf: Array.isArray(users) ? users : undefined,
    teamIsAnyOf: Array.isArray(teams) ? teams : undefined
  }
}

function parseExportDate(iso8601: unknown, fieldName: string): Date | undefined | InvalidInputError {
  if (!iso8601) return undefined
  const date = parseISO8601(iso8601)
  if (!date) {
    return invalidInput(`Export ${fieldName} must be a valid ISO-8601 date.`, [ fieldName ])
  }
  return date
}
