import express from 'express'
import moment from 'moment'
import { compatibilityMageAppErrorHandler } from '../adapters.controllers.web'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import { UserLocationRepository } from '../../entities/locations/entities.locations'
import { ExoUserLocation, RecentUserLocationQueryParams, UserLocationQueryParams, ReadLocationsGroupedByUser, ReadUserLocations, SaveUserLocations, UserLocationRequest, CommonUserLocationQueryParams } from '../../app.api/locations/app.api.locations'
import { invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { UserWithRole } from '../../permissions/permissions.role-based.base'

export interface UserLocationAppLayer {
  readUserLocations: ReadUserLocations
  readLocationsGroupedByUser: ReadLocationsGroupedByUser
  saveUserLocations: SaveUserLocations
}

export interface UserLocationWebAppRequestFactory {
  <Params extends object>(req: express.Request, params?: Params): Params & UserLocationRequest<UserWithRole>
}

export interface EnsureEventScope {
  (eventId: MageEventId): Promise<null | { mageEvent: MageEvent, locationRepository: UserLocationRepository }>
}

export function UserLocationRoutes(app: UserLocationAppLayer, createAppRequest: UserLocationWebAppRequestFactory): express.Router {

  const routes = express.Router().use(express.json())

  routes.route('/')
    .get(async (req, res, next) => {
      const params = parseUserLocationQueryParams(req.query)
      if (params instanceof MageError) {
        return next(params)
      }
      const appReq = createAppRequest(req, { params })
      const appRes = await app.readUserLocations(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
    .post(async (req, res, next) => {
      const locations = parseLocationBody(req)
      if (locations instanceof MageError) {
        return next(locations)
      }
      const appReq = createAppRequest(req, { locations })
      const appRes = await app.saveUserLocations(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  routes.route('/users')
    .get(async (req, res, next) => {
      const params = parseRecentUserLocationQueryParams(req.query)
      if (params instanceof MageError) {
        return next(params)
      }
      const appReq = createAppRequest(req, { params })
      const appRes = await app.readLocationsGroupedByUser(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  return routes.use(compatibilityMageAppErrorHandler)
}

function parseCommonLocationQueryParams(params: any): CommonUserLocationQueryParams | InvalidInputError {
  const query: CommonUserLocationQueryParams = {}

  if (params.startDate) {
    const startDate = parseISO8601(params.startDate)
    if (startDate) {
      query.startDate = startDate
    } else {
      return invalidInput('startDate must be a valid ISO-8601 date.', [ 'startDate' ])
    }
  }

  if (params.endDate) {
    const endDate = parseISO8601(params.endDate)
    if (endDate) {
      query.endDate = endDate
    } else {
      return invalidInput('endDate must be a valid ISO-8601 date.', [ 'endDate' ])
    }
  }

    if (params.users) {
    if (typeof params.users === 'string') {
      query.userIsAnyOf = params.users.split(',')
    } else if (Array.isArray(params.users)) {
      query.userIsAnyOf = params.users
    } else {
      return invalidInput('users must be CSV string or array user ids', [ 'users' ])
    }
  }

  if (params.teams) {
    if (typeof params.teams === 'string') {
      query.teamIsAnyOf = params.teams.split(',')
    } else if (Array.isArray(params.teams)) {
      query.teamIsAnyOf = params.teams
    } else {
      return invalidInput('teams must be CSV string or array of team ids', [ 'teams' ])
    }
  }

  return query
}

function parseUserLocationQueryParams(params: any): UserLocationQueryParams | InvalidInputError {
  const common = parseCommonLocationQueryParams(params)
  if (common instanceof MageError) {
    return common
  }
  const query: UserLocationQueryParams = { ...common }
  if (params.page_size || params.page) {
    query.paging = {
      pageSize: parseInt(String(params.page_size)) || 10,
      pageIndex: parseInt(String(params.page)) || 0
    }
  }
  return query
}

function parseRecentUserLocationQueryParams(params: any): RecentUserLocationQueryParams | InvalidInputError {
  const common = parseCommonLocationQueryParams(params)
  if (common instanceof MageError) {
    return common
  }
  const query: RecentUserLocationQueryParams = { ...common }
  query.limit = params.limit ? parseInt(String(params.limit)) : 1

  query.populate = params.populate === 'true'

  return query
}

function parseLocationBody(req: express.Request): ExoUserLocation[] | InvalidInputError {
  const locations = Array.isArray(req.body) ? req.body : [req.body]
  for (const location of locations) {
    if (!location.geometry) {
      return invalidInput('location geometry is required', [ 'geometry' ])
    }
    location.properties = location.properties || {}
    if (!location.properties.timestamp) {
      return invalidInput('location timestamp is required', [ 'timestamp' ])
    }
    location.type = 'Feature'
    location.properties.timestamp = moment.utc(location.properties.timestamp).toDate()
    location.properties.deviceId = req.provisionedDeviceId
  }
  return locations as ExoUserLocation[]
}

function parseISO8601(iso8601: string): Date | undefined {
  const date = moment(iso8601, moment.ISO_8601, true)
  if (typeof iso8601 === 'string' && date.isValid()) {
    return date.toDate()
  }
}
