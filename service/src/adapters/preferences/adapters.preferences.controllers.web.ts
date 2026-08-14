import express from 'express'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { GetEventPreferences, GetEventPreferencesRequest } from '../../app.api/preferences/app.api.preferences'
import { invalidInput } from '../../app.api/app.api.errors'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
import { AppRequest } from '../../app.api/app.api.global'

export interface UserPreferencesAppLayer {
  getEventPreferences: GetEventPreferences
}

export function UserPreferencesRoutes(
  app: UserPreferencesAppLayer,
  createAppRequest: WebAppRequestFactory<AppRequest<UserWithRole>>
) {
  const routes = express.Router()
  routes.use(express.json())

  routes.route('/events/:eventId')
    .get(async (req, res, next) => {
      const eventId = req.params.eventId

      if (!eventId || isNaN(Number(eventId))) {
        return next(invalidInput('Event id must be a number.', [ 'eventId' ]))
      }

      const appReq: GetEventPreferencesRequest = createAppRequest(req, { eventId: Number(eventId) })
      const appRes = await app.getEventPreferences(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
  })

  return routes.use(compatibilityMageAppErrorHandler)
}
