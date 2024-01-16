import express from 'express'
import passport from 'passport';
import { WebAppRequestFactory } from '../adapters.controllers.web'
import { SystemInfoAppLayer } from '../../app.api/systemInfo/app.api.systemInfo'
import { AppRequest, AppRequestContext } from '../../app.api/app.api.global'
import { UserWithRole } from '../../permissions/permissions.role-based.base'
// import { User } from '../../models/user'

type SystemInfoRequestType = AppRequest<UserWithRole, AppRequestContext<UserWithRole>>;


export function SystemInfoRoutes(appLayer: SystemInfoAppLayer, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()



  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest<SystemInfoRequestType>(req)

      const appRes = await appLayer.readSystemInfo(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  return routes


}

async function handleRequest(
  req: SystemInfoRequestType,
  res: express.Response,
  next: express.NextFunction,
  appLayer: SystemInfoAppLayer,
  // isAuthenticated: boolean
) {
  try {
    const appRes = await appLayer.readSystemInfo(req);
    if (appRes.success) {
      res.json(appRes.success);
    } else {
      next(appRes.error);
    }
  } catch (err) {
    next(err);
  }
}