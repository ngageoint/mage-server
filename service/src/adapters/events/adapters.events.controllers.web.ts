import express from 'express'
import { AddFeedToEvent, ListEventFeeds, AddFeedToEventRequest, ListEventFeedsRequest, RemoveFeedFromEvent, RemoveFeedFromEventRequest, EventRequest } from '../../app.api/events/app.api.events'
import { FetchFeedContent, FetchFeedContentRequest } from '../../app.api/feeds/app.api.feeds'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'

export type EventFeedsApp = {
  addFeedToEvent: AddFeedToEvent
  listEventFeeds: ListEventFeeds
  removeFeedFromEvent: RemoveFeedFromEvent
  fetchFeedContent: FetchFeedContent
}

export function EventFeedsRoutes(eventFeeds: EventFeedsApp, createAppRequest: WebAppRequestFactory<EventRequest>): express.Router {

  const routes = express.Router()
  routes.use(express.json({
    strict: false
  }))

  routes.route('/')
    .post(async (req, res, next) => {
      if (typeof req.body !== 'string') {
        return res.status(400).json('post a json feed id string')
      }
      const feedId = req.body
      const appReq: AddFeedToEventRequest = createAppRequest(req, { feed: feedId })
      const appRes = await eventFeeds.addFeedToEvent(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .get(async (req, res, next) => {
      const appReq: ListEventFeedsRequest = createAppRequest(req)
      const appRes = await eventFeeds.listEventFeeds(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:feedId')
    .delete(async (req, res, next) => {
      const appReq: RemoveFeedFromEventRequest = createAppRequest(req, {
        feed: req.params.feedId
      })
      const appRes = await eventFeeds.removeFeedFromEvent(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/:feedId/content')
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