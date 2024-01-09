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
     const appReq = createAppRequest<SystemInfoRequestType>(req); // Define appReq

     console.log()

     if (req.headers.authorization) {
        // Directly use passport.authenticate with a custom callback
       passport.authenticate(
         'bearer',
         { session: false },
         (err: any, user: any | false) => {
           if (err) {
             return next(err);
           }
           if (!user) {
             // Authentication failed - Send a JSON response
             return res.status(401).json({ error: 'Unauthorized access' });
           }
           // Authentication successful, attach user to request
           req.user = user;
           handleRequest(appReq, res, next, appLayer);
         }
       )(req, res, next);
     } else {
       // Proceed without authentication if no Authorization header
       handleRequest(appReq, res, next, appLayer);
     }

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