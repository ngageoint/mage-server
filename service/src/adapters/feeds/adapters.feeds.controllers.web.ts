
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // interface Request {
    // }
  }
}

import express from 'express'
import { ListFeedServiceTypes, ListServiceTopics, CreateFeedService, ListFeedServices, PreviewTopics, PreviewTopicsRequest, CreateFeed, CreateFeedRequest, ListServiceTopicsRequest, ListAllFeeds, PreviewFeedRequest, PreviewFeed, GetFeed, UpdateFeed, UpdateFeedRequest, DeleteFeed, DeleteFeedRequest, ListServiceFeeds, ListServiceFeedsRequest, DeleteFeedService, GetFeedService } from '../../app.api/feeds/app.api.feeds'
import { invalidInput, ErrEntityNotFound } from '../../app.api/app.api.errors'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { FeedServiceId, FeedTopicId } from '../../entities/feeds/entities.feeds'

export interface FeedsAppLayer {
  listServiceTypes: ListFeedServiceTypes
  createService: CreateFeedService
  listServices: ListFeedServices
  getService: GetFeedService
  previewTopics: PreviewTopics
  listTopics: ListServiceTopics
  previewFeed: PreviewFeed
  createFeed: CreateFeed
  listAllFeeds: ListAllFeeds
  listServiceFeeds: ListServiceFeeds
  deleteService: DeleteFeedService
  getFeed: GetFeed
  updateFeed: UpdateFeed
  deleteFeed: DeleteFeed
}

export function FeedsRoutes(appLayer: FeedsAppLayer, createAppRequest: WebAppRequestFactory): express.Router {
  const routes = express.Router()
  routes.use(express.json())

  routes.route('/service_types')
    .get(async (req, res, next): Promise<any> => {
      const appReq = createAppRequest(req)
      const appRes = await appLayer.listServiceTypes(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  routes.route('/service_types/:serviceTypeId/topic_preview')
    .post(async (req, res, next): Promise<any> => {
      const body = req.body
      const appReq: PreviewTopicsRequest = createAppRequest(req, {
        serviceType: req.params.serviceTypeId,
        serviceConfig: body.serviceConfig
      })
      const appRes = await appLayer.previewTopics(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/services')
    .post(async (req, res, next): Promise<any> => {
      const body = req.body
      const params = {
        serviceType: body.serviceType,
        config: body.config || null,
        title: body.title,
        summary: body.summary
      }
      if (!params.serviceType) {
        return next(invalidInput('invalid request', [ 'missing', 'serviceType' ]))
      }
      if (!params.title) {
        return next(invalidInput('invalid request', [ 'missing', 'title' ]))
      }
      const appReq = createAppRequest(req, params)
      const appRes = await appLayer.createService(appReq)
      if (appRes.success) {
        return res.status(201).json(appRes.success)
      }
      if (appRes.error?.code === ErrEntityNotFound) {
        return res.status(400).json({ message: 'service type not found' })
      }
      next(appRes.error)
    })
    .get(async (req, res, next): Promise<any> => {
      const appReq = createAppRequest(req)
      const appRes = await appLayer.listServices(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  routes.route('/services/:serviceId/topics')
    .get(async (req, res, next) => {
      const appReq: ListServiceTopicsRequest = createAppRequest(req, {
        service: req.params.serviceId
      })
      const appRes = await appLayer.listTopics(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  const feedCreateParamsFromRequestBody = (service: FeedServiceId, topic: FeedTopicId, bodyFeed: any): Pick<CreateFeedRequest, 'feed'> => {
    if (!bodyFeed) {
      bodyFeed = {}
    }
    return {
      feed: {
        service,
        topic,
        title: bodyFeed.title,
        summary: bodyFeed.summary,
        icon: bodyFeed.icon,
        constantParams: bodyFeed.constantParams,
        variableParamsSchema: bodyFeed.variableParamsSchema,
        itemsHaveIdentity: bodyFeed.itemsHaveIdentity,
        itemsHaveSpatialDimension: bodyFeed.itemsHaveSpatialDimension,
        itemTemporalProperty: bodyFeed.itemTemporalProperty,
        itemPrimaryProperty: bodyFeed.itemPrimaryProperty,
        itemSecondaryProperty: bodyFeed.itemSecondaryProperty,
        updateFrequencySeconds: bodyFeed.updateFrequencySeconds,
        mapStyle: bodyFeed.mapStyle,
        itemPropertiesSchema: bodyFeed.itemPropertiesSchema,
        localization: bodyFeed.localization,
      }
    }
  }

  routes.route('/services/:serviceId/topics/:topicId/feed_preview')
    .post(async (req, res, next) => {
      const params = feedCreateParamsFromRequestBody(req.params.serviceId, req.params.topicId, req.body.feed) as Omit<PreviewFeedRequest, 'context'>
      params.variableParams = req.body.variableParams
      if (String(req.query.skip_content_fetch).toLocaleLowerCase() === 'true') {
        params.skipContentFetch = true
      }
      const appReq = createAppRequest(req, params)
      const appRes = await appLayer.previewFeed(appReq)
      if (appRes.success) {
        return res.status(200).json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/services/:serviceId/topics/:topicId/feeds')
    .post(async (req, res, next) => {
      const params: Omit<CreateFeedRequest, 'context'> = feedCreateParamsFromRequestBody(req.params.serviceId, req.params.topicId, req.body)
      const appReq = createAppRequest(req, params)
      const appRes = await appLayer.createFeed(appReq)
      if (appRes.success) {
        return res
          .status(201)
          .header('location', `${req.baseUrl}/${appRes.success.id}`)
          .json(appRes.success)
      }
      return next(appRes.error)
    })

  routes.route('/services/:serviceId/feeds')
    .get(async (req, res, next) => {
      const appReq: ListServiceFeedsRequest = createAppRequest(req, { service: req.params.serviceId })
      const appRes = await appLayer.listServiceFeeds(appReq)
      if (appRes.success) {
        return res.status(200).json(appRes.success)
      }
      return next(appRes.error)
    })


  routes.route('/services/:serviceId')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req, { service: req.params.serviceId })
      const appRes = await appLayer.getService(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .delete(async (req, res, next) => {
      const appReq = createAppRequest(req, { service: req.params.serviceId })
      const appRes = await appLayer.deleteService(appReq)
      if (appRes.success) {
        return res.status(200).type('text').send()
      }
      return next(appRes.error)
    })

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await appLayer.listAllFeeds(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })

  // Temporary

  routes.route('/service_types/:serviceTypeId')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await appLayer.listServiceTypes(appReq)
      if (appRes.success) {
        return res.json(appRes.success.filter(serviceType => {
          return serviceType.id === req.params.serviceTypeId;
        })[0])
      }
      next(appRes.error)
    })

  routes.route('/services/:serviceId/topics/:topicId')
    .get(async (req, res, next) => {
      const appReq: ListServiceTopicsRequest = createAppRequest(req, {
        service: req.params.serviceId
      })
      const appRes = await appLayer.listTopics(appReq)
      if (appRes.success) {
        return res.json(appRes.success.filter(topic => {
          return topic.id === req.params.topicId;
        })[0])
      }
      next(appRes.error)
    })

  routes.route('/:feedId')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req, { feed: req.params.feedId })
      const appRes = await appLayer.getFeed(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .put(async (req, res, next) => {
      const updateParams = Object.assign({ ...feedCreateParamsFromRequestBody('remove', 'remove', req.body).feed }, { id: req.body.id as string }) as any
      delete updateParams.service
      delete updateParams.topic
      const appReq: UpdateFeedRequest = createAppRequest(req, { feed: updateParams })
      const appRes = await appLayer.updateFeed(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      return next(appRes.error)
    })
    .delete(async (req, res, next) => {
      const feedId = req.params.feedId
      const appReq: DeleteFeedRequest = createAppRequest(req, { feed: feedId })
      const appRes = await appLayer.deleteFeed(appReq)
      if (appRes.success) {
        return res.status(200).type('text').send('')
      }
      return next(appRes.error)
    })

  routes.use(compatibilityMageAppErrorHandler)

  return routes
}
