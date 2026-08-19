import express from 'express'
import moment from 'moment'
import {
  CreateLocations,
  CreateLocationsRequest,
  LocationRequest,
  ReadLocations,
  ReadLocationsGroupedByUser,
  ReadLocationsGroupedByUserRequest,
  ReadLocationsRequest
} from '../../app.api/locations/app.api.locations'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { RecentUserLocations } from '../../entities/locations/entities.locations'

export interface LocationAppLayer {
  createLocations: CreateLocations
  readLocations: ReadLocations
  readLocationsGroupedByUser: ReadLocationsGroupedByUser
}

export interface LocationWebAppRequestFactory {
  <Params extends object | undefined>(req: express.Request, params?: Params): Params & Omit<LocationRequest, 'params'>
}

export function LocationRoutes(appLayer: LocationAppLayer, createAppRequest: LocationWebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/users')
    .get(async (req, res, next) => {
      const startDate = parseDateParam(req.query.startDate)
      const endDate = parseDateParam(req.query.endDate)
      const limitParam = req.query.limit as string | undefined
      const limit = limitParam ? parseInt(limitParam) : 1
      const populate = req.query.populate === 'true'

      const appReq: ReadLocationsGroupedByUserRequest = createAppRequest<Omit<ReadLocationsGroupedByUserRequest, 'context'>>(req, {
        startDate,
        endDate,
        limit,
        populate
      })

      const appRes = await appLayer.readLocationsGroupedByUser(appReq)
      if (appRes.success) {
        return res.json(appRes.success.map(jsonForRecentUserLocations))
      }
      next(appRes.error)
    })

  routes.route('/')
    .get(async (req, res, next) => {
      const startDate = parseDateParam(req.query.startDate)
      const endDate = parseDateParam(req.query.endDate)
      const lastLocationId = req.query.lastLocationId as string | undefined
      const limitParam = req.query.limit as string | undefined
      const limit = limitParam ? parseInt(limitParam) : 1

      const appReq: ReadLocationsRequest = createAppRequest<Omit<ReadLocationsRequest, 'context'>>(req, {
        startDate,
        endDate,
        lastLocationId,
        limit
      })

      const appRes = await appLayer.readLocations(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
    .post(async (req, res, next) => {
      const body = Array.isArray(req.body) ? req.body : [req.body]
      const locations = body.map((location: any) => ({
        geometry: location.geometry,
        properties: {
          ...location.properties,
          timestamp: location.properties?.timestamp ? moment.utc(location.properties.timestamp).toDate() : undefined,
          deviceId: (req as any).provisionedDeviceId
        }
      }))

      const appReq: CreateLocationsRequest = createAppRequest<Omit<CreateLocationsRequest, 'context'>>(req, { locations })
      const appRes = await appLayer.createLocations(appReq)
      if (appRes.success) {
        return res.json(Array.isArray(req.body) ? appRes.success : appRes.success[0])
      }
      next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)

  return routes
}

function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  return moment.utc(value).toDate()
}

function jsonForRecentUserLocations(recent: RecentUserLocations): any {
  return {
    id: recent.user ? recent.user.id : recent.userId,
    user: recent.user,
    locations: recent.locations
  }
}
