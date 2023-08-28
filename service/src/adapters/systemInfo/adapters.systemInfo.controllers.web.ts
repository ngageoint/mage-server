
import express from 'express'
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { SystemInfoAppLayer } from '../../app.api/systemInfo/app.api.systemInfo'


export function SystemInfoRoutes(appLayer: SystemInfoAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req)
        
      const appRes = await appLayer.readSystemInfo(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  return routes
}