
import express from 'express'
import { AnonymousUser, UserWithRole } from '../../permissions/permissions.role-based.base'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { AppRequest } from '../../app.api/app.api.global'
import { SystemInfoAppLayer } from '../../app.api/systemInfo/app.api.systemInfo'

export function SystemInfoRoutes(appLayer: SystemInfoAppLayer, createAppRequest: WebAppRequestFactory<AppRequest<UserWithRole | AnonymousUser>>): express.Router {

  const routes = express.Router()

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await appLayer.readSystemInfo(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      
      next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)
  
  return routes
}