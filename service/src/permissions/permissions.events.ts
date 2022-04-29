import { UserDocument } from '../models/user'
import { MageEventDocument, TeamDocument } from '../models/event'
import { AppRequestContext } from '../app.api/app.api.global'
import { PermissionDeniedError, permissionDenied } from '../app.api/app.api.errors'
import { FeedId } from '../entities/feeds/entities.feeds'
import { allPermissions, AnyPermission } from '../entities/authorization/entities.permissions'
import { FeedsPermissionService } from '../app.api/feeds/app.api.feeds'
import { MageEventAttrs, MageEventRepository, EventPermission, rolesWithPermission } from '../entities/events/entities.events'
import EventModel from '../models/event'
import access from '../access'
import mongoose from 'mongoose'
import { UserId } from '../entities/users/entities.users'
import { MongooseMageEventRepository } from '../adapters/events/adapters.events.db.mongoose'

export interface EventRequestContext extends AppRequestContext<UserDocument> {
  readonly event: MageEventAttrs | MageEventDocument
}

type TeamMembership = {
  userIds: string[]
}

declare module 'mongoose' {
  export const Document: new (...args: any[]) => MongooseDocument
}

/**
 * TODO: This should not depend explicitly on the MongooseMageEventRepository,
 * but the MageEventRepository interface instead.  However, a large number of
 * tests mock a very specific chain of Mongoose model methods, so to avoid
 * breaking those tests for now, this class will use the Mongoose event model
 * directly to populate event teams.
 */
export class EventPermissionServiceImpl {

  constructor(readonly eventRepo: MongooseMageEventRepository) {}

  async ensureEventUpdatePermission(context: AppRequestContext): Promise<PermissionDeniedError | null> {
    const eventContext = context as EventRequestContext
    if (eventContext.event) {
      return await this.authorizeEventAccess(eventContext.event, eventContext.requestingPrincipal(), 'UPDATE_EVENT', 'update')
    }
    return permissionDenied('UPDATE_EVENT', String(context.requestingPrincipal()))
  }

  async ensureEventReadPermission(context: AppRequestContext): Promise<PermissionDeniedError | null> {
    const eventContext = context as EventRequestContext
    if (eventContext.event) {
      return await this.authorizeEventAccess(eventContext.event, eventContext.requestingPrincipal(), 'READ_EVENT_USER', 'read')
    }
    return permissionDenied('READ_EVENT_USER', String(context.requestingPrincipal()))
  }

  async authorizeEventAccess(event: MageEventAttrs | MageEventDocument, user: UserDocument, appPermission: AnyPermission, eventPermission: EventPermission): Promise<PermissionDeniedError | null> {
    if (access.userHasPermission(user, appPermission)) {
      return null
    }
    const hasEventAclPermission = await this.userHasEventPermission(event, user._id.toHexString(), eventPermission)
    if (hasEventAclPermission) {
      return null
    }
    return permissionDenied(appPermission, user.username, String(event.id))
  }

  async userHasEventPermission(event: MageEventAttrs | MageEventDocument, userId: UserId, eventPermission: EventPermission): Promise<boolean> {
    let teams: TeamMembership[] = await this.resolveTeams(event)
    // if asking for event read permission and user is part of a team in this event
    if (eventPermission === 'read') {
      const userIsEventParticipant = teams.some(team => team.userIds.indexOf(userId) !== -1)
      if (userIsEventParticipant) {
        return true
      }
    }
    let userEventRole = event.acl[userId]
    if (typeof userEventRole === 'object') {
      userEventRole = userEventRole.role
    }
    const userRoleHasPermission = rolesWithPermission(eventPermission).some(role => role === userEventRole)
    return userRoleHasPermission
  }

  private async resolveTeams(event: MageEventAttrs | MageEventDocument): Promise<TeamMembership[]> {
    if (event instanceof mongoose.Document) {
      if (!(event).populated('teamIds')) {
        event = await new Promise<MageEventDocument>((resolve, reject) => {
          this.eventRepo.model.populate(event, 'teamIds' as any, (err, x) => {
            if (err) {
              reject(err)
            }
            resolve(x as MageEventDocument)
          })
        })
      }
      return (event.teamIds as TeamDocument[]).map(x => {
        return {
          userIds: x.userIds.map(id => id.toHexString())
        }
      })
    }
    // TODO: eliminate this side-effect mutation of the argument if possible
    // if (!event.teams) {
    //   event.teams = (await this.eventRepo.findTeamsInEvent(event.id))!
    // }
    // return event.teams
    // well, let's just try it
    const teams = await this.eventRepo.findTeamsInEvent(event.id)
    return teams!
  }
}

export const defaultEventPermissionsSevice = new EventPermissionServiceImpl(new MongooseMageEventRepository(EventModel.Model))

export class EventFeedsPermissionService implements FeedsPermissionService {

  constructor(readonly eventRepo: MageEventRepository, readonly eventPermissions: EventPermissionServiceImpl) {}

  async ensureFetchFeedContentPermissionFor(context: EventRequestContext, feed: FeedId): Promise<PermissionDeniedError | null> {
    return await this.eventPermissions.ensureEventReadPermission(context)
  }
  async ensureListServiceTypesPermissionFor(context: EventRequestContext): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_LIST_SERVICE_TYPES, context.requestingPrincipal().username)
  }
  async ensureCreateServicePermissionFor(context: EventRequestContext): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_CREATE_SERVICE, context.requestingPrincipal().username)
  }
  async ensureListServicesPermissionFor(context: EventRequestContext): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_LIST_SERVICES, context.requestingPrincipal().username)
  }
  async ensureListTopicsPermissionFor(context: EventRequestContext, service: string): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_LIST_TOPICS, context.requestingPrincipal().username)
  }
  async ensureCreateFeedPermissionFor(context: EventRequestContext, service: string): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_CREATE_FEED, context.requestingPrincipal().username)
  }
  async ensureListAllFeedsPermissionFor(context: EventRequestContext): Promise<PermissionDeniedError | null> {
    return permissionDenied(allPermissions.FEEDS_LIST_ALL, context.requestingPrincipal().username)
  }
}