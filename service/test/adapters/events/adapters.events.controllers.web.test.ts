import { beforeEach } from 'mocha'
import express from 'express'
import { expect } from 'chai'
import supertest from 'supertest'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import uniqid from 'uniqid'
import _ from 'lodash'
import { AppResponse, AppRequest } from '../../../lib/app.api/app.api.global'
import { WebAppRequestFactory } from '../../../lib/adapters/adapters.controllers.web'
import { MageEvent, MageEventRepository } from '../../../lib/entities/events/entities.events'
import { AddFeedToEventRequest, ListEventFeedsRequest, UserFeed, RemoveFeedFromEventRequest } from '../../../lib/app.api/events/app.api.events'
import { FeedId, FeedContent } from '../../../lib/entities/feeds/entities.feeds'
import { FetchFeedContentRequest } from '../../../lib/app.api/feeds/app.api.feeds'
import { EventFeedsApp, EventFeedsRoutes } from '../../../lib/adapters/events/adapters.events.controllers.web'

const rootPath = '/test/events'
const jsonMimeType = /^application\/json/
const testUser = 'lummytin'

describe('event feeds web controller', function() {

  let createAppRequest: WebAppRequestFactory = <P>(webReq: express.Request, params?: P): AppRequest<typeof testUser> & P => {
    return {
      context: {
        requestToken: Symbol(),
        requestingPrincipal(): typeof testUser {
          return testUser
        }
      },
      ...(params || {})
    } as AppRequest<typeof testUser> & P
  }
  let eventFeedsRoutes: express.Router
  let app: express.Application
  let eventRepo: SubstituteOf<MageEventRepository>
  let eventFeedsApp: SubstituteOf<EventFeedsApp>
  let client: supertest.SuperTest<supertest.Test>
  let event: MageEvent

  beforeEach(function() {
    const eventId = Date.now()
    event = {
      id: eventId,
      name: 'Test Event',
      description: 'For testing',
      complete: false,
      forms: [],
      teamIds: [],
      layerIds: [],
      feedIds: [],
      style: {},
      acl: {
        [testUser]: {
          role: 'GUEST',
          permissions: [ 'read' ]
        }
      }
    }
    eventRepo = Sub.for<MageEventRepository>()
    eventRepo.findById(eventId).resolves(event)
    eventFeedsApp = Sub.for<EventFeedsApp>()
    eventFeedsApp.eventRepo.returns!(eventRepo)
    eventFeedsRoutes = EventFeedsRoutes(eventFeedsApp, createAppRequest)
    app = express()
    app.use(rootPath, eventFeedsRoutes)
    client = supertest(app)
  })

  describe('POST /events/{eventId}/feeds', function() {

    it('adds a feed to the context event', async function() {

      const feedId = uniqid()
      event.feedIds.push(feedId)
      const requestParams: Partial<AddFeedToEventRequest> = {
        event: event.id,
        feed: feedId
      }
      eventFeedsApp.addFeedToEvent(Arg.is(x => _.isMatch(x, requestParams)))
        .resolves(AppResponse.success<MageEvent, unknown>(event))
      const res = await client
        .post(`${rootPath}/${event.id}/feeds`)
        .type('json')
        .send(JSON.stringify(feedId))

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(event)
      eventFeedsApp.received(1).addFeedToEvent(Arg.is(x => _.isMatch(x, requestParams)))
    })

    it('fails with 404 if the event does not exist', async function() {
      expect.fail('todo')
    })

    it('fails with 400 if the feed does not exist', async function() {
      expect.fail('todo')
    })

    it('fails with 403 without permission', async function() {
      expect.fail('todo')
    })
  })

  describe('GET /events/{eventId}/feeds', function() {

    it('returns the list of feeds assigned to the event', async function() {

      const eventFeeds: UserFeed[] = [
        {
          id: uniqid(),
          service: 'service1',
          topic: 'ringram',
          title: 'Feed 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        },
        {
          id: uniqid(),
          service: 'service2',
          topic: 'dingdorf',
          title: 'Feed 2',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        }
      ]
      event.feedIds.concat(eventFeeds[0].id, eventFeeds[1].id)
      const reqParams: Partial<ListEventFeedsRequest> = {
        event: event.id
      }
      eventFeedsApp.listEventFeeds(Arg.is(x => _.isMatch(x, reqParams)))
        .resolves(AppResponse.success<UserFeed[], unknown>(eventFeeds))
      const res = await client.get(`${rootPath}/${event.id}/feeds`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(eventFeeds)
      eventFeedsApp.received(1).listEventFeeds(Arg.is(x => _.isMatch(x, reqParams)))
    })

    it('fails with 404 if the event does not exist', async function() {
      expect.fail('todo')
    })

    it('fails with 403 without permission', async function() {
      expect.fail('todo')
    })
  })

  describe('DELETE /events/{eventId}/feeds/{feedId}', function() {

    it('removes the feed id from the event feeds list', async function() {

      const feedId = uniqid()
      const appReqParams: Omit<RemoveFeedFromEventRequest, 'context'> = {
        event: event.id,
        feed: feedId
      }
      eventFeedsApp.removeFeedFromEvent(Arg.is(x => _.isMatch(x, appReqParams)))
        .resolves(AppResponse.success<MageEvent, unknown>(event))
      const res = await client.delete(`${rootPath}/${event.id}/feeds/${feedId}`)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(event)
      eventFeedsApp.received(1).removeFeedFromEvent(Arg.is(x => _.isMatch(x, appReqParams)))
    })

    it('fails with 400 if the feed is not assigned to the event', async function() {
      expect.fail('todo')
    })

    it('fails with 404 if the event does not exist', async function() {
      expect.fail('todo')
    })

    it('fails with 403 without permission', async function() {
      expect.fail('todo')
    })
  })

  describe('POST /events/{eventId}/feeds/{feedId}/content', function() {

    it('fetches the feed content', async function() {

      const feedId: FeedId = uniqid()
      const variableParams = {
        bbox: [ -104.25, 44.02, -104.20, 44.025 ]
      }
      const appReqParams: Partial<FetchFeedContentRequest> = {
        feed: feedId,
        variableParams
      }
      const content: FeedContent = {
        feed: feedId,
        topic: 'testing',
        items: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              id: uniqid(),
              geometry: { type: 'Point', coordinates: [ -104.23, 44.022 ] },
              properties: {
                title: 'fetches the feed content'
              }
            }
          ]
        }
      }
      eventFeedsApp.fetchFeedContent(Arg.is(x => _.isMatch(x, appReqParams)))
        .resolves(AppResponse.success<FeedContent, unknown>(content))
      const res = await client
        .post(`${rootPath}/${event.id}/feeds/${feedId}/content`)
        .send(variableParams)

      expect(res.status).to.equal(200)
      expect(res.type).to.match(jsonMimeType)
      expect(res.body).to.deep.equal(content)
      eventFeedsApp.received(1).fetchFeedContent(Arg.is(x => _.isMatch(x, appReqParams)))
    })
  })
})