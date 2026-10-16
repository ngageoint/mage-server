import express from 'express'
import moment from 'moment'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { ReadLogins, ReadLoginsFilter, LoginRequest } from '../../app.api/logins/app.api.logins'
import { UserWithRole } from '../../permissions/permissions.role-based.base'

/**
 * Express adapter for the Login use case in app.impl/logins/app.impl.logins.ts.
 * Exposes GET /api/logins: parses the request into the app.api/logins
 * request shape, invokes ReadLogins, and translates the AppResponse back
 * into an HTTP response
 */

export interface LoginAppLayer {
  readLogins: ReadLogins
}

export interface LoginWebAppRequestFactory {
  <Params extends object>(req: express.Request, params?: Params): Params & LoginRequest<UserWithRole>
}

export function LoginRoutes(app: LoginAppLayer, createAppRequest: LoginWebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/')
    .get(async (req, res, next) => {
      let limit = 10
      if (req.query.limit && !isNaN(Number(req.query.limit))) {
        limit = Number(req.query.limit)
      }
      const lastLoginId = (req.query.lastLoginId as string) || null
      const firstLoginId = (req.query.firstLoginId as string) || null
      const filter = parseFilter(req.query)

      const appReq = createAppRequest(req, { filter, limit, lastLoginId, firstLoginId })
      const appRes = await app.readLogins(appReq)
      if (appRes.success) {
        const logins = appRes.success
        const response: { logins: typeof logins, next?: string, prev?: string } = { logins }
        if (logins.length) {
          response.next = `/api/logins?lastLoginId=${logins[logins.length - 1].id}`
          response.prev = `/api/logins?firstLoginId=${logins[0].id}`
          const parameters = generateParameters(filter, limit)
          response.next += parameters
          response.prev += parameters
        }
        return res.json(response)
      }
      next(appRes.error)
    })

  return routes.use(compatibilityMageAppErrorHandler)
}

function parseFilter(query: express.Request['query']): ReadLoginsFilter {
  const filter: ReadLoginsFilter = {}
  if (query.userId) {
    filter.userId = query.userId as string
  }
  if (query.deviceId) {
    filter.deviceId = query.deviceId as string
  }
  if (query.deviceIds) {
    const ids = (query.deviceIds as string).split(',').map(id => id.trim())
    filter.deviceId = { $in: ids }
  }
  if (query.startDate) {
    filter.startDate = moment(query.startDate as string).toDate()
  }
  if (query.endDate) {
    filter.endDate = moment(query.endDate as string).toDate()
  }
  return filter
}

function generateParameters(filter: ReadLoginsFilter, limit: number): string {
  let partial = ''
  if (filter.userId) {
    partial += '&userId=' + filter.userId
  }
  if (filter.deviceId) {
    partial += '&deviceId=' + filter.deviceId
  }
  if (filter.startDate) {
    partial += '&startDate=' + filter.startDate
  }
  if (filter.endDate) {
    partial += '&endDate=' + filter.endDate
  }
  if (limit) {
    partial += '&limit=' + limit
  }
  return partial
}
