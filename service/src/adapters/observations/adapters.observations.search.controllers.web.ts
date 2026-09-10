import express from 'express'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { AppRequest } from '../../app.api/app.api.global'
import { invalidInput } from '../../app.api/app.api.errors'
import { SearchIndexAllEvents, SearchIndexAllEventsRequest, SearchIndexEvent, SearchIndexEventRequest } from '../../app.api/observations/app.api.observations.search'

export interface SearchIndexAppLayer {
  searchIndexAll: SearchIndexAllEvents
  searchIndexEvent: SearchIndexEvent
}

export function SearchIndexRoutes(appLayer: SearchIndexAppLayer, createAppRequest: WebAppRequestFactory<AppRequest<UserWithRole>>): express.Router {

  const routes = express.Router()

  routes.route('/events')
    .post(async (req, res, next) => {
      const appReq: SearchIndexAllEventsRequest = createAppRequest(req)

      const appRes = await appLayer.searchIndexAll(appReq)
      if (appRes.success) {
        return res.sendStatus(202)
      }
      next(appRes.error)
    })

  routes.route('/events/:eventId')
    .post(async (req, res, next) => {
      const eventId = req.params.eventId
      if (!eventId || isNaN(Number(eventId))) {
        return next(invalidInput('Event id must be a number.', [ 'eventId' ]))
      }
      const appReq: SearchIndexEventRequest = createAppRequest(req, { eventId: Number(eventId) })
      const appRes = await appLayer.searchIndexEvent(appReq)
      if (appRes.success) {
        return res.sendStatus(202)
      }
      next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)

  return routes
}
