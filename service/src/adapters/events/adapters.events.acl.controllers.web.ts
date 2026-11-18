import express from 'express'
import { ListEventAcl, ListEventAclRequest, RemoveEventAclUser, RemoveEventAclUserRequest, SetEventAclRole, SetEventAclRoleRequest } from '../../app.api/events/app.api.events.acl'
import { EventRequest } from '../../app.api/events/app.api.events'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'

export type EventAclApp = {
  listEventAcl: ListEventAcl
  setEventAclRole: SetEventAclRole
  removeEventAclUser: RemoveEventAclUser
}

export function EventAclRoutes(eventAcl: EventAclApp, createAppRequest: WebAppRequestFactory<EventRequest>): express.Router {

  const routes = express.Router()
  routes.use(express.json())

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq: ListEventAclRequest = createAppRequest(req)
      const appRes = await eventAcl.listEventAcl(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:userId')
    .put(async (req, res, next) => {
      const appReq: SetEventAclRoleRequest = createAppRequest(req, {
        user: req.params.userId,
        role: req.body?.role
      })
      const appRes = await eventAcl.setEventAclRole(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .delete(async (req, res, next) => {
      const appReq: RemoveEventAclUserRequest = createAppRequest(req, {
        user: req.params.userId
      })
      const appRes = await eventAcl.removeEventAclUser(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)
  return routes
}
