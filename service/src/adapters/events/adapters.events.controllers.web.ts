import express from 'express'
import { MageEventRepository, MageEventId } from '../../entities/events/entities.events'
import { AddFeedToEvent, ListEventFeeds, AddFeedToEventRequest, ListEventFeedsRequest, RemoveFeedFromEvent, RemoveFeedFromEventRequest } from '../../app.api/events/app.api.events'
import { FetchFeedContent, FetchFeedContentRequest } from '../../app.api/feeds/app.api.feeds'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'

export type EventFeedsApp = {
  eventRepo: MageEventRepository
  addFeedToEvent: AddFeedToEvent
  listEventFeeds: ListEventFeeds
  removeFeedFromEvent: RemoveFeedFromEvent
  fetchFeedContent: FetchFeedContent
}

export function EventFeedsRoutes(eventFeeds: EventFeedsApp, createAppRequest: WebAppRequestFactory): express.Router {

  const routes = express.Router()
  routes.use(express.json({
    strict: false
  }))

  routes.param('eventId', async (req, res, next, value) => {
    const eventId: MageEventId = parseInt(value)
    const event = await eventFeeds.eventRepo.findById(eventId)
    if (!event) {
      return res.status(404).json('event not found')
    }
    req.eventEntity = event
    return next()
  })

  routes.route('/:eventId/feeds')
    .post(async (req, res, next) => {
      if (typeof req.body !== 'string') {
        return res.status(400).json('post a json feed id string')
      }
      const feedId = req.body
      const appReq: AddFeedToEventRequest = createAppRequest(req, { event: req.eventEntity!.id, feed: feedId })
      const appRes = await eventFeeds.addFeedToEvent(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .get(async (req, res, next) => {
      const appReq: ListEventFeedsRequest = createAppRequest(req, {
        event: req.eventEntity!.id
      })
      const appRes = await eventFeeds.listEventFeeds(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:eventId/feeds/:feedId')
    .delete(async (req, res, next) => {
      const appReq: RemoveFeedFromEventRequest = createAppRequest( req, {
        event: req.eventEntity!.id,
        feed: req.params.feedId
      })
      const appRes = await eventFeeds.removeFeedFromEvent(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:eventId/feeds/:feedId/content')
    .post(async (req, res, next) => {
      const appReq: FetchFeedContentRequest = createAppRequest(req, {
        feed: req.params.feedId,
        variableParams: req.body
      })
      const appRes = await eventFeeds.fetchFeedContent(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)
  return routes
}