import express from 'express'
import { MageEventId, MageEventRepository } from '../../entities/events/entities.events'
import { EventAclRequest, ListEventAcl, ListEventAclRequest, RemoveEventAclUser, RemoveEventAclUserRequest, SetEventAclRole, SetEventAclRoleRequest } from '../../app.api/events/app.api.events.acl'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'

export type EventAclApp = {
  eventRepo: MageEventRepository
  listEventAcl: ListEventAcl
  setEventAclRole: SetEventAclRole
  removeEventAclUser: RemoveEventAclUser
}

export function EventAclRoutes(eventAcl: EventAclApp, createAppRequest: WebAppRequestFactory<EventAclRequest>): express.Router {

  const routes = express.Router()
  routes.use(express.json())

  routes.param('eventId', async (req, res, next, value) => {
    const eventId: MageEventId = parseInt(value)
    const event = await eventAcl.eventRepo.findById(eventId)
    if (!event) {
      return res.status(404).json('event not found')
    }
    req.eventEntity = event
    return next()
  })

  routes.route('/:eventId/acl')
    .get(async (req, res, next) => {
      const appReq: ListEventAclRequest = createAppRequest(req)
      const appRes = await eventAcl.listEventAcl(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:eventId/acl/:userId')
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
