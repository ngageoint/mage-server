import _ from 'lodash'
import uniqid from 'uniqid'
import { expect } from 'chai'
import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { MageEvent, MageEventId, MageEventRepository } from '../../../lib/entities/events/entities.events'
import { AddFeedToEventRequest, ListEventFeedsRequest, RemoveFeedFromEventRequest } from '../../../lib/app.api/events/app.api.events'
import { AddFeedToEvent, ListEventFeeds, RemoveFeedFromEvent } from '../../../lib/app.impl/events/app.impl.events'
import { MageError, ErrEntityNotFound, permissionDenied, ErrPermissionDenied, EntityNotFoundError, PermissionDeniedError } from '../../../lib/app.api/app.api.errors'
import { AppRequest } from '../../../lib/app.api/app.api.global'
import { Feed, FeedRepository, FeedServiceRepository, FeedServiceTypeRepository } from '../../../lib/entities/feeds/entities.feeds'
import { EventPermissionServiceImpl } from '../../../lib/permissions/permissions.events'
import { UserDocument } from '../../../src/models/user'


function requestBy<P extends object>(user: string, params: P): AppRequest<SubstituteOf<UserDocument>> & P {
  const userDoc = Sub.for<UserDocument>()
  userDoc.id.returns!(uniqid())
  return {
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => userDoc
    },
    ...params
  }
}

describe('event feeds use case interactions', function() {

  let app: EventsUseCaseInteractions
  let event: MageEvent

  beforeEach(function() {
    app = new EventsUseCaseInteractions()
    event = {
      id: 123,
      name: 'Maintenance Issues',
      teamIds: [],
      layerIds: [],
      style: {},
      forms: [],
      acl: {},
      feedIds: []
    }
  })

  describe('assigning a feed to an event', function() {

    it('saves the feed to the event feeds list', async function() {

      const req: AddFeedToEventRequest = requestBy('admin', {
        feed: uniqid(),
        event: event.id
      })
      const updatedEvent = { ...event }
      updatedEvent.feedIds = [ req.feed ]
      app.eventRepo.findById(event.id).resolves(event)
      app.eventRepo.addFeedsToEvent(req.event, req.feed).resolves(updatedEvent)
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)

      const res = await app.addFeedToEvent(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('object')
      expect(res.success?.feedIds).to.deep.equal([ req.feed ])
      app.eventRepo.received(1).addFeedsToEvent(req.event, req.feed)
    })

    it('fails if the event id does not exist', async function() {

      const req: AddFeedToEventRequest = requestBy('admin', {
        feed: uniqid(),
        event: event.id
      })
      app.eventRepo.findById(Arg.all()).resolves(null)
      app.eventRepo.addFeedsToEvent(Arg.all()).resolves(null)
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)

      const res = await app.addFeedToEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(req.event)
      expect(err.data.entityType).to.equal('MageEvent')
      app.eventRepo.didNotReceive().addFeedsToEvent(Arg.all())
    })

    it('checks permission for assigning a feed to the event', async function() {

      const req: AddFeedToEventRequest = requestBy('admin', {
        feed: uniqid(),
        event: event.id
      })
      app.eventRepo.findById(req.event).resolves(event)
      app.eventRepo.addFeedsToEvent(Arg.all()).resolves(event)
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(permissionDenied('update_event', 'admin'))

      const res = await app.addFeedToEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      app.eventRepo.received(0).addFeedsToEvent(Arg.all())
      app.permissionService.received(1).ensureEventUpdatePermission(req.context)
    })
  })

  describe('listing event feeds', function() {

    let eventId: MageEventId
    let event: MageEvent

    beforeEach(async function() {
      eventId = new Date().getMilliseconds()
      event = {
        id: eventId,
        name: 'List Event Feeds',
        teamIds: [],
        layerIds: [],
        forms: [],
        style: {},
        acl: {},
        feedIds: [ uniqid(), uniqid() ]
      }
      app.eventRepo.findById(eventId).resolves(event)
    })

    it('returns feeds for an event', async function() {

      const feeds: { [id: string]: Feed } = {
        [event.feedIds[0]]: {
          id: event.feedIds[0],
          service: uniqid(),
          topic: 'topic1',
          title: 'Feed 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        },
        [event.feedIds[1]]: {
          id: event.feedIds[1],
          service: uniqid(),
          topic: 'topic2',
          title: 'Feed 2',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
        }
      }
      app.feedRepo.findAllByIds(event.feedIds).resolves(feeds)
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId })
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(Array.isArray(res.success)).to.be.true
      expect(res.success).to.have.deep.members(Object.values(feeds))
    })

    it('omits feed properties users should not see', async function() {

      const feed: Feed = {
        id: uniqid(),
        service: uniqid(),
        topic: 'topic1',
        title: 'Feed 1',
        summary: 'Feed 1 for testing',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPrimaryProperty: 'label',
        itemSecondaryProperty: 'level',
        itemTemporalProperty: 'timestamp',
        updateFrequencySeconds: 3600,
        variableParamsSchema: {
          type: 'object',
          properties: {
            bbox: {
              type: 'array',
              items: { type: 'number' }
            }
          }
        },
        constantParams: {
          apiKey: 'abc123'
        }
      }
      event.feedIds.push(feed.id)
      app.feedRepo.findAllByIds(event.feedIds).resolves({ [feed.id]: feed })
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId })
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(res.success).to.be.an('array')
      expect(res.success).to.deep.equal([
        _.omit(feed, 'constantParams')
      ])
    })

    it('fails if the event does not exist', async function() {

      const req: ListEventFeedsRequest = requestBy('admin', {
        event: eventId + 1
      })
      app.eventRepo.findById(req.event).resolves(null)
      const res = await app.listEventFeeds(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(req.event)
      expect(err.data.entityType).to.equal('MageEvent')
    })

    it('checks permission for listing event feeds', async function() {

      const req: ListEventFeedsRequest = requestBy('admin', { event: event.id })
      app.feedRepo.findAllByIds(event.feedIds).resolves({})
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(permissionDenied('read_event_user', 'admin'))
      const res = await app.listEventFeeds(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      app.feedRepo.didNotReceive().findAllByIds(Arg.all())
      app.permissionService.received(1).ensureEventReadPermission(req.context)
    })
  })

  describe('removing a feed from an event', function() {

    it('saves the event feed list without the removed feed', async function() {

      event.feedIds.push(uniqid(), uniqid())
      const updatedEvent = { ...event }
      updatedEvent.feedIds = [ event.feedIds[1] ]
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)
      app.eventRepo.findById(event.id).resolves(event)
      app.eventRepo.removeFeedsFromEvent(event.id, event.feedIds[0]).resolves(updatedEvent)
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: event.id, feed: event.feedIds[0] })
      const res = await app.removeFeedFromEvent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(updatedEvent)
      app.eventRepo.received(1).removeFeedsFromEvent(event.id, event.feedIds[0])
    })

    it('fails if the event does not exist', async function() {

      app.eventRepo.findById(event.id).resolves(null)
      app.eventRepo.removeFeedsFromEvent(Arg.all()).resolves(null)
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: event.id, feed: uniqid() })
      const res = await app.removeFeedFromEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(event.id)
      expect(err.data.entityType).to.equal('MageEvent')
      app.eventRepo.didNotReceive().removeFeedsFromEvent(Arg.all())
    })

    it('fails if the event was removed before udpating', async function() {

      event.feedIds.push(uniqid(), uniqid())
      const updatedEvent = { ...event }
      updatedEvent.feedIds = [ event.feedIds[1] ]
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)
      app.eventRepo.findById(event.id).resolves(event)
      app.eventRepo.removeFeedsFromEvent(event.id, event.feedIds[0]).resolves(null)
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: event.id, feed: event.feedIds[0] })
      const res = await app.removeFeedFromEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(event.id)
      expect(err.data.entityType).to.equal('MageEvent')
      expect(err.message).to.equal('event removed before update')
      app.eventRepo.received(1).removeFeedsFromEvent(event.id, event.feedIds[0])
    })

    it('checks permission for removing the feed from the event', async function() {

      app.eventRepo.findById(Arg.any()).resolves(event)
      app.permissionService.ensureEventUpdatePermission(Arg.any()).resolves(permissionDenied('update_event', 'admin', String(event.id)))
      const req: RemoveFeedFromEventRequest = requestBy('admin',
        { event: event.id, feed: uniqid() })
      const res = await app.removeFeedFromEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrPermissionDenied)
      const err = res.error as PermissionDeniedError
      expect(err.data.subject).to.equal('admin')
      expect(err.data.permission).to.equal('update_event')
      expect(err.data.object).to.equal(String(event.id))
      app.eventRepo.received(1).findById(event.id)
      app.permissionService.received(1).ensureEventUpdatePermission(req.context)
      app.eventRepo.didNotReceive().removeFeedsFromEvent(Arg.all())
    })

    it('fails if the feed id is not in the event feeds list', async function() {

      event.feedIds = []
      app.eventRepo.findById(event.id).resolves(event)
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: event.id, feed: uniqid() })
      app.permissionService.ensureEventUpdatePermission(Arg.deepEquals(req.context)).resolves(null)
      const res = await app.removeFeedFromEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(req.feed)
      expect(err.data.entityType).to.equal('MageEvent.feedIds')
      app.eventRepo.received(1).findById(event.id)
      app.eventRepo.didNotReceive().removeFeedsFromEvent(Arg.all())
    })
  })
})

class EventsUseCaseInteractions {

  readonly eventRepo = Sub.for<MageEventRepository>()
  readonly feedRepo = Sub.for<FeedRepository>()
  readonly feedServiceRepo = Sub.for<FeedServiceRepository>()
  readonly feedServiceTypeRepo = Sub.for<FeedServiceTypeRepository>()
  readonly permissionService = Sub.for<EventPermissionServiceImpl>()

  readonly addFeedToEvent = AddFeedToEvent(this.permissionService, this.eventRepo)
  readonly listEventFeeds = ListEventFeeds(this.permissionService, this.eventRepo, this.feedRepo)
  readonly removeFeedFromEvent = RemoveFeedFromEvent(this.permissionService, this.eventRepo)
}
