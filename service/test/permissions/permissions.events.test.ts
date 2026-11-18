import { describe, it } from 'mocha'
import { expect } from 'chai'
import uniqid from 'uniqid'
import { FeedServiceId, FeedId } from '../../lib/entities/feeds/entities.feeds'
import { ErrPermissionDenied, permissionDenied } from '../../lib/app.api/app.api.errors'
import { EventFeedsPermissionService, EventPermissionServiceImpl } from '../../lib/permissions/permissions.events'
import { Substitute as Sub, SubstituteOf, Arg } from '@fluffy-spoon/substitute'
import { MageEvent, MageEventRepository, MageEventAttrs, EventAccessType } from '../../lib/entities/events/entities.events'
import { EventRequestContext } from '../../lib/app.api/events/app.api.events'
// for some reason vs code marks an error if using @lib/models/user, even though tsc builds fine
// nobody seems to care though - https://github.com/microsoft/TypeScript/issues/39709
import { MongooseMageEventRepository } from '../../lib/adapters/events/adapters.events.db.mongoose'
import { MageEventPermission } from '../../lib/entities/authorization/entities.permissions'
import { Model as MageEventModel } from '../../lib/models/event'
import { Team } from '../../lib/entities/teams/entities.teams'
import { UserWithRole } from '../../src/permissions/permissions.role-based.base'


describe('event permissions service', function() {

  let eventRepo: SubstituteOf<MongooseMageEventRepository>
  let eventPermissions: EventPermissionServiceImpl

  beforeEach(function() {
    eventRepo = Sub.for<MongooseMageEventRepository>()
    eventPermissions = new EventPermissionServiceImpl(eventRepo)
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
      //TODO remove cast to any, was MageEventDocument
      const eventDoc = new MageEventModel({
        _id: 2,
      }) as any
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
      //TODO remove cast to any, was MageEventDocument
      const eventDoc = new MageEventModel({
        _id: 2,
      }) as any
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
    const user = Sub.for<UserWithRole>()
    user.username.returns!('participant')
    const eventFor = (id: number) => new MageEvent({ id, name: `Event ${id}`, feedIds, forms: [], layerIds: [], acl: {}, style: {} })
    const contextFor = (mageEvent: MageEvent): EventRequestContext<UserWithRole> => ({
      requestToken: Symbol(),
      requestingPrincipal() { return user },
      locale() { return null },
      mageEvent
    })
    const event = eventFor(3579)
    const context = contextFor(event)

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

    eventPermissions.authorizeEventAccess(Arg.is(x => x === event), Arg.any(), MageEventPermission.READ_EVENT_USER, EventAccessType.Read).resolves(null)
    denied = await permissions.ensureFetchFeedContentPermissionFor(context, feedIds[0])
    expect(denied).to.be.null

    const deniedEvent = eventFor(3580)
    eventPermissions.authorizeEventAccess(Arg.is(x => x === deniedEvent), Arg.any(), MageEventPermission.READ_EVENT_USER, EventAccessType.Read)
      .resolves(permissionDenied('event_read', user.username, String(deniedEvent.id)))
    denied = await permissions.ensureFetchFeedContentPermissionFor(contextFor(deniedEvent), feedIds[0])
    expect(denied?.code).to.equal(ErrPermissionDenied)
    expect(denied?.data.permission).to.equal('event_read')
    expect(denied?.data.subject).to.equal(user.username)
    expect(denied?.data.object).to.equal(String(deniedEvent.id))
  })
})
