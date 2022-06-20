import { describe, it } from 'mocha'
import { expect } from 'chai'
import uniqid from 'uniqid'
import { AppRequestContext } from '../../lib/app.api/app.api.global'
import { FeedServiceId, FeedId } from '../../lib/entities/feeds/entities.feeds'
import { ErrPermissionDenied, permissionDenied } from '../../lib/app.api/app.api.errors'
import { EventFeedsPermissionService, EventRequestContext, EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { MageEventRepository, MageEventAttrs, EventAccessType } from '../../lib/entities/events/entities.events'
// for some reason vs code marks an error if using @lib/models/user, even though tsc builds fine
// nobody seems to care though - https://github.com/microsoft/TypeScript/issues/39709
import { UserDocument } from '../../src/models/user'
import { MongooseMageEventRepository } from '../../lib/adapters/events/adapters.events.db.mongoose'
import { MageEventPermission } from '../../lib/entities/authorization/entities.permissions'
import { Model as MageEventModel } from '../../lib/models/event'
import { MageEventDocument } from '../../src/models/event'
import { Team } from '../../lib/entities/teams/entities.teams'


describe('event permissions service', function() {

  let eventRepo: SubstituteOf<MongooseMageEventRepository>
  let mockEventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let eventPermissions: EventPermissionServiceImpl
  let user: SubstituteOf<UserDocument>
  let event: SubstituteOf<MageEventAttrs>
  let context: EventRequestContext

  beforeEach(function() {
    eventRepo = Sub.for<MongooseMageEventRepository>()
    mockEventPermissions = Sub.for<EventPermissionServiceImpl>()
    eventPermissions = new EventPermissionServiceImpl(eventRepo)
    user = Sub.for<UserDocument>()
    event = Sub.for<MageEventAttrs>()
    context = {
      requestToken: Symbol(),
      requestingPrincipal() {
        return user
      },
      locale() { return null },
      event
    }
  })

  describe('enforcing permissions with context event', function() {

    it('ensures event read permission', async function() {

      mockEventPermissions.ensureEventReadPermission(Arg.all()).mimicks(eventPermissions.ensureEventReadPermission.bind(mockEventPermissions))
      const permissionError = permissionDenied(uniqid(), uniqid(), uniqid())
      mockEventPermissions.authorizeEventAccess(Arg.all()).resolves(permissionError)

      const denied = await mockEventPermissions.ensureEventReadPermission(context)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data).to.deep.include({
        subject: permissionError.data.subject,
        permission: permissionError.data.permission,
        object: permissionError.data.object
      })
      mockEventPermissions.received(1).authorizeEventAccess(context.event, user, MageEventPermission.READ_EVENT_USER, EventAccessType.Read)
    })

    it('ensures event update permission', async function() {

      mockEventPermissions.ensureEventUpdatePermission(Arg.all()).mimicks(eventPermissions.ensureEventUpdatePermission.bind(mockEventPermissions))
      const permissionError = permissionDenied(uniqid(), uniqid(), uniqid())
      mockEventPermissions.authorizeEventAccess(Arg.all()).resolves(permissionError)

      const denied = await mockEventPermissions.ensureEventUpdatePermission(context)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      expect(denied?.data).to.deep.include({
        subject: permissionError.data.subject,
        permission: permissionError.data.permission,
        object: permissionError.data.object
      })
      mockEventPermissions.received(1).authorizeEventAccess(context.event, user, MageEventPermission.UPDATE_EVENT, EventAccessType.Update)
    })

    it('denies if the context has no event', async function() {

      const noEventContext: AppRequestContext = {
        requestToken: Symbol(),
        requestingPrincipal() { return user },
        locale() { return null }
      }
      let denied = await eventPermissions.ensureEventReadPermission(noEventContext)
      expect(denied?.code).to.equal(ErrPermissionDenied)
      denied = await eventPermissions.ensureEventUpdatePermission(noEventContext)
      expect(denied?.code).to.equal(ErrPermissionDenied)
    })
  })

  describe('checking user event participation', function() {

    it('returns true if the user is a member of an event team', async function() {

      const team1: Team = {
        id: 'team1',
        userIds: [ 'user1', 'user2', 'user3' ]
      } as Team
      const team2: Team = {
        id: 'team2',
        userIds: [ 'user3', 'user4', 'user5' ]
      } as Team
      const eventDoc = new MageEventModel({
        _id: 2,
      }) as MageEventDocument
      const eventAttrs: MageEventAttrs = { id: 2 } as MageEventAttrs
      eventRepo.findTeamsInEvent(Arg.is((x: any) => Number(x.id) === 2)).resolves([ team1, team2 ])
      const eventDocParticipation = await eventPermissions.userIsParticipantInEvent(eventDoc, 'user4')
      const eventEntityParticipation = await eventPermissions.userIsParticipantInEvent(eventAttrs, 'user4')

      expect(eventDocParticipation).to.be.true
      expect(eventEntityParticipation).to.be.true
    })

    it('returns false if the user is not a member of any event team', async function() {

      const team1: Team = {
        id: 'team1',
        userIds: [ 'user1', 'user2', 'user3' ]
      } as Team
      const team2: Team = {
        id: 'team2',
        userIds: [ 'user3', 'user4', 'user5' ]
      } as Team
      const eventDoc = new MageEventModel({
        _id: 2,
      }) as MageEventDocument
      const eventAttrs: MageEventAttrs = { id: 2 } as MageEventAttrs
      eventRepo.findTeamsInEvent(Arg.is((x: any) => Number(x.id) === 2)).resolves([ team1, team2 ])
      const eventDocParticipation = await eventPermissions.userIsParticipantInEvent(eventDoc, 'user6')
      const eventEntityParticipation = await eventPermissions.userIsParticipantInEvent(eventAttrs, 'user6')

      expect(eventDocParticipation).to.be.false
      expect(eventEntityParticipation).to.be.false
    })
  })
})

describe('event feeds permission service', function() {

  let service: FeedServiceId
  let eventPermissions: SubstituteOf<EventPermissionServiceImpl>
  let eventRepo: SubstituteOf<MageEventRepository>
  let permissions: EventFeedsPermissionService

  beforeEach(function() {
    service = uniqid()
    eventRepo = Sub.for<MageEventRepository>()
    eventPermissions = Sub.for<EventPermissionServiceImpl>()
    permissions = new EventFeedsPermissionService(eventRepo, eventPermissions)
  })

  it('denies all except fetch', async function() {

    const feedIds: FeedId[] = [ uniqid(), uniqid() ]
    const user = Sub.for<UserDocument>()
    user.username.returns!('participant')
    const event = Sub.for<MageEventAttrs>()
    event.id.returns!(3579)
    event.feedIds.returns!(feedIds)
    let context: EventRequestContext = {
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null },
      event
    }

    let denied = await permissions.ensureListServiceTypesPermissionFor(context)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    denied = await permissions.ensureCreateServicePermissionFor(context)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    denied = await permissions.ensureListServicesPermissionFor(context)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    denied = await permissions.ensureListTopicsPermissionFor(context, service)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    denied = await permissions.ensureCreateFeedPermissionFor(context, service)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    denied = await permissions.ensureListAllFeedsPermissionFor(context)
    expect(denied?.code).to.equal(ErrPermissionDenied)

    eventPermissions.ensureEventReadPermission(Arg.is(x => x === context)).resolves(null)
    denied = await permissions.ensureFetchFeedContentPermissionFor(context, feedIds[0])
    expect(denied).to.be.null

    const context2 = { ...context }
    eventPermissions.ensureEventReadPermission(Arg.is(x => x === context2)).resolves(null)
    denied = await permissions.ensureFetchFeedContentPermissionFor(context2, feedIds[1])
    expect(denied).to.be.null

    const feedNotInEvent = uniqid()
    const context3 = { ...context }
    eventPermissions.ensureEventReadPermission(Arg.is(x => x === context3)).resolves(permissionDenied('event_read', user.username, String(event.id)))
    denied = await permissions.ensureFetchFeedContentPermissionFor(context3, feedNotInEvent)
    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.permission).to.equal('event_read')
    expect(denied?.data.subject).to.equal(user.username)
    expect(denied?.data.object).to.equal(String(event.id))
  })
})