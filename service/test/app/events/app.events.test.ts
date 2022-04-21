import _ from 'lodash'
import uniqid from 'uniqid'
import { expect } from 'chai'
import { Substitute as Sub, Arg, SubstituteOf } from '@fluffy-spoon/substitute'
import { copyMageEventAttrs, MageEvent, MageEventId, MageEventRepository } from '../../../lib/entities/events/entities.events'
import { AddFeedToEventRequest, ListEventFeedsRequest, RemoveFeedFromEventRequest, UserFeed } from '../../../lib/app.api/events/app.api.events'
import { AddFeedToEvent, ListEventFeeds, RemoveFeedFromEvent } from '../../../lib/app.impl/events/app.impl.events'
import { MageError, ErrEntityNotFound, permissionDenied, ErrPermissionDenied, EntityNotFoundError, PermissionDeniedError } from '../../../lib/app.api/app.api.errors'
import { AppRequest } from '../../../lib/app.api/app.api.global'
import { Feed, FeedRepository, FeedServiceRepository, FeedServiceTypeRepository } from '../../../lib/entities/feeds/entities.feeds'
import { EventPermissionServiceImpl } from '../../../lib/permissions/permissions.events'
import { ContentLanguageKey, LanguageTag, Locale, Localized } from '../../../lib/entities/entities.i18n'
import { UserDocument } from '../../../src/models/user'


function requestBy<P extends object>(user: string, params: P, locale?: Locale): AppRequest<SubstituteOf<UserDocument>> & P {
  const userDoc = Sub.for<UserDocument>()
  userDoc.id.returns!(uniqid())
  return {
    context: {
      requestToken: Symbol(),
      requestingPrincipal: () => userDoc,
      locale() { return locale || null }
    },
    ...params
  }
}

describe('event feeds use case interactions', function() {

  let app: EventsUseCaseInteractions
  let event: MageEvent

  beforeEach(function() {
    app = new EventsUseCaseInteractions()
    event = new MageEvent({
      id: 123,
      name: 'Maintenance Issues',
      teamIds: [],
      layerIds: [],
      style: {},
      forms: [],
      acl: {},
      feedIds: []
    })
  })

  describe('assigning a feed to an event', function() {

    it('saves the feed to the event feeds list', async function() {

      const req: AddFeedToEventRequest = requestBy('admin', {
        feed: uniqid(),
        event: event.id
      })
      const updatedEvent = copyMageEventAttrs(event)
      updatedEvent.feedIds = [ req.feed ]
      app.eventRepo.findById(event.id).resolves(new MageEvent(updatedEvent))
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
      event = new MageEvent({
        id: eventId,
        name: 'List Event Feeds',
        teamIds: [],
        layerIds: [],
        forms: [],
        style: {},
        acl: {},
        feedIds: [ uniqid(), uniqid() ]
      })
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

    it('localizes the feed titles and descriptions', async function() {

      const feeds: { [id: string]: Feed } = {
        [event.feedIds[0]]: {
          id: event.feedIds[0],
          service: uniqid(),
          topic: 'topic1',
          title: 'Feed 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPropertiesSchema: {
            properties: {
              prop11: {
                title: 'Prop 1.1'
              },
              prop12: {
                title: 'Prop 1.2'
              }
            },
          },
          localization: {
            'es': {
              properties: {
                prop11: {
                  title: "ES Prop 1.1"
                }
              }
            }
          }
        },
        [event.feedIds[1]]: {
          id: event.feedIds[1],
          service: uniqid(),
          topic: 'topic2',
          title: 'Feed 2',
          summary: 'Feed 2 makes happy',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPropertiesSchema: {
            properties: {
              prop21: {
                title: 'Prop 2.1',
                description: 'Prop 2.1 is great'
              },
              prop22: {
                title: 'Prop 2.2',
                description: 'Prop 2.2 is funny'
              }
            },
          },
          localization: {
            'es': {
              title: 'ES Feed 2',
              summary: 'ES Feed 2 makes happy',
              properties: {
                prop21: {
                  title: 'ES Prop 2.1',
                  description: 'ES Prop 2.1 is great'
                }
              }
            }
          }
        }
      }
      const localizedFeeds: Localized<UserFeed>[] = [
        {
          id: event.feedIds[0],
          service: feeds[event.feedIds[0]].service,
          topic: 'topic1',
          title: 'Feed 1',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPropertiesSchema: {
            properties: {
              prop11: {
                title: 'ES Prop 1.1'
              },
              prop12: {
                title: 'Prop 1.2'
              }
            },
          },
          [ContentLanguageKey]: new LanguageTag('es')
        },
        {
          id: event.feedIds[1],
          service: feeds[event.feedIds[1]].service,
          topic: 'topic2',
          title: 'ES Feed 2',
          summary: 'ES Feed 2 makes happy',
          itemsHaveIdentity: true,
          itemsHaveSpatialDimension: true,
          itemPropertiesSchema: {
            properties: {
              prop21: {
                title: 'ES Prop 2.1',
                description: 'ES Prop 2.1 is great'
              },
              prop22: {
                title: 'Prop 2.2',
                description: 'Prop 2.2 is funny'
              }
            },
          },
          [ContentLanguageKey]: new LanguageTag('es')
        }
      ]
      app.feedRepo.findAllByIds(event.feedIds).resolves(feeds)
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId }, { languagePreferences: [ new LanguageTag('es-419'), new LanguageTag('en-US') ]})
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(Array.isArray(res.success)).to.be.true
      expect(res.success).to.have.deep.members(localizedFeeds)
      const lang = new LanguageTag('es')
      res.success?.forEach(feed => {
        expect(feed[ContentLanguageKey]?.toString()).to.equal(lang.toString())
      })
      const contentLanguage = res.contentLanguage as LanguageTag[]
      expect(contentLanguage).to.have.length(1)
      expect(contentLanguage[0].toString()).to.equal(lang.toString())
    })

    it('omits localization from feeds even when there are no language preferences', async function() {

      const feed: Feed = {
        id: event.feedIds[0],
        service: uniqid(),
        topic: 'topic1',
        title: 'Feed 1',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPropertiesSchema: {
          properties: {
            prop11: {
              title: 'Prop 1.1'
            },
            prop12: {
              title: 'Prop 1.2'
            }
          },
        },
        localization: {
          'es': {
            properties: {
              prop11: {
                title: "ES Prop 1.1"
              }
            }
          }
        }
      }
      const localizedFeed: UserFeed = _.omit(feed, 'localization')
      app.feedRepo.findAllByIds(event.feedIds).resolves({ [feed.id]: feed })
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId }, { languagePreferences: [] })
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(Array.isArray(res.success)).to.be.true
      expect(res.success).to.deep.equal([ localizedFeed ])
    })

    it('omits localization from feeds when there are no matching language preferences', async function() {

      const feed: Feed = {
        id: event.feedIds[0],
        service: uniqid(),
        topic: 'topic1',
        title: 'Feed 1',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPropertiesSchema: {
          properties: {
            prop11: {
              title: 'Prop 1.1'
            },
            prop12: {
              title: 'Prop 1.2'
            }
          },
        },
        localization: {
          'es': {
            properties: {
              prop11: {
                title: "ES Prop 1.1"
              }
            }
          }
        }
      }
      const localizedFeed: UserFeed = _.omit(feed, 'localization')
      app.feedRepo.findAllByIds(event.feedIds).resolves({ [feed.id]: feed })
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId }, { languagePreferences: [ new LanguageTag('en-GB') ] })
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(Array.isArray(res.success)).to.be.true
      expect(res.success).to.deep.equal([ localizedFeed ])
    })

    it('omits localization from feeds when there is no locale on the request context', async function() {

      const feed: Feed = {
        id: event.feedIds[0],
        service: uniqid(),
        topic: 'topic1',
        title: 'Feed 1',
        itemsHaveIdentity: true,
        itemsHaveSpatialDimension: true,
        itemPropertiesSchema: {
          properties: {
            prop11: {
              title: 'Prop 1.1'
            },
            prop12: {
              title: 'Prop 1.2'
            }
          },
        },
        localization: {
          'es': {
            properties: {
              prop11: {
                title: "ES Prop 1.1"
              }
            }
          }
        }
      }
      const localizedFeed: UserFeed = _.omit(feed, 'localization')
      app.feedRepo.findAllByIds(event.feedIds).resolves({ [feed.id]: feed })
      app.permissionService.ensureEventReadPermission(Arg.all()).resolves(null)
      const req: ListEventFeedsRequest = requestBy('admin', { event: eventId })
      const res = await app.listEventFeeds(req)

      expect(res.error).to.be.null
      expect(Array.isArray(res.success)).to.be.true
      expect(res.success).to.deep.equal([ localizedFeed ])
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

      const before = new MageEvent({ ...copyMageEventAttrs(event), feedIds: [ uniqid(), uniqid() ]})
      const after = new MageEvent({ ...copyMageEventAttrs(before), feedIds: [ before.feedIds[1] ] })
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)
      app.eventRepo.findById(before.id).resolves(before)
      app.eventRepo.removeFeedsFromEvent(before.id, before.feedIds[0]).resolves(copyMageEventAttrs(after))
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: before.id, feed: before.feedIds[0] })
      const res = await app.removeFeedFromEvent(req)

      expect(res.error).to.be.null
      expect(res.success).to.deep.equal(copyMageEventAttrs(after))
      app.eventRepo.received(1).removeFeedsFromEvent(before.id, before.feedIds[0])
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

      const before = new MageEvent({ ...copyMageEventAttrs(event), feedIds: [ uniqid(), uniqid() ] })
      app.permissionService.ensureEventUpdatePermission(Arg.all()).resolves(null)
      app.eventRepo.findById(before.id).resolves(before)
      app.eventRepo.removeFeedsFromEvent(before.id, before.feedIds[0]).resolves(null)
      const req: RemoveFeedFromEventRequest = requestBy('admin', { event: before.id, feed: before.feedIds[0] })
      const res = await app.removeFeedFromEvent(req)

      expect(res.success).to.be.null
      expect(res.error).to.be.instanceOf(MageError)
      expect(res.error?.code).to.equal(ErrEntityNotFound)
      const err = res.error as EntityNotFoundError
      expect(err.data.entityId).to.equal(before.id)
      expect(err.data.entityType).to.equal('MageEvent')
      expect(err.message).to.equal('event removed before update')
      app.eventRepo.received(1).removeFeedsFromEvent(before.id, before.feedIds[0])
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

      const noFeeds = new MageEvent({ ...copyMageEventAttrs(event), feedIds: [] })
      app.eventRepo.findById(event.id).resolves(noFeeds)
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
