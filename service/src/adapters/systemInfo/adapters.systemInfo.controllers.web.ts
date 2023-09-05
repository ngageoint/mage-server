
import express from 'express'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { SystemInfoAppLayer } from '../../app.api/systemInfo/app.api.systemInfo'
import { AppRequest, AppRequestContext } from '../../app.api/app.api.global'
import { UserWithRole } from '../../permissions/permissions.role-based.base'

type systemInfoRequestType = AppRequest<UserWithRole, AppRequestContext<UserWithRole>>;


export function SystemInfoRoutes(appLayer: SystemInfoAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest<systemInfoRequestType>(req)

      const appRes = await appLayer.readSystemInfo(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  return routes
}