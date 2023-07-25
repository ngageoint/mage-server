import { UserDocument } from '../models/user'
import { MageEventDocument } from '../models/event'
import { AppRequestContext } from '../app.api/app.api.global'
import { PermissionDeniedError, permissionDenied } from '../app.api/app.api.errors'
import { FeedId } from '../entities/feeds/entities.feeds'
import { allPermissions, AnyPermission, MageEventPermission } from '../entities/authorization/entities.permissions'
import { FeedsPermissionService } from '../app.api/feeds/app.api.feeds'
import { MageEventAttrs, MageEventRepository, EventAccessType, rolesWithPermission } from '../entities/events/entities.events'
import EventModel from '../models/event'
import access from '../access'
import { UserId } from '../entities/users/entities.users'
import { MongooseMageEventRepository } from '../adapters/events/adapters.events.db.mongoose'
import { TeamId } from '../entities/teams/entities.teams'

export interface EventRequestContext extends AppRequestContext<UserDocument> {
  readonly event: MageEventAttrs | MageEventDocument
}

type TeamMembership = {
  id: TeamId
  userIds: UserId[]
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
      return await this.authorizeEventAccess(eventContext.event, eventContext.requestingPrincipal(), MageEventPermission.UPDATE_EVENT, EventAccessType.Update)
    }
    return permissionDenied(MageEventPermission.UPDATE_EVENT, String(context.requestingPrincipal()))
  }

  async ensureEventReadPermission(context: AppRequestContext): Promise<PermissionDeniedError | null> {
    const eventContext = context as EventRequestContext
    if (eventContext.event) {
      return await this.authorizeEventAccess(eventContext.event, eventContext.requestingPrincipal(), MageEventPermission.READ_EVENT_USER, EventAccessType.Read)
    }
    return permissionDenied(MageEventPermission.READ_EVENT_USER, String(context.requestingPrincipal()))
  }

  /**
   * Check for the given app-level permission on the role of the given user.
   * If present, grant the user access.  If not, check for the given event-
   * level permission on the ACL of the given event.  If present, grant the
   * user access.  Otherwise, deny access.
   * @param event
   * @param user
   * @param appPermission
   * @param eventPermission
   * @returns
   */
  async authorizeEventAccess(event: MageEventAttrs | MageEventDocument, user: UserDocument, appPermission: AnyPermission, eventPermission: EventAccessType): Promise<PermissionDeniedError | null> {
    if (access.userHasPermission(user, appPermission)) {
      return null
    }
    const hasEventAclPermission = await this.userHasEventPermission(event, user.id, eventPermission)
    if (hasEventAclPermission) {
      return null
    }
    return permissionDenied(appPermission, user.username, String(event.id))
  }

  async userHasEventPermission(event: MageEventAttrs | MageEventDocument, userId: UserId, eventPermission: EventAccessType): Promise<boolean> {
    if (eventPermission === EventAccessType.Read && await this.userIsParticipantInEvent(event, userId)) {
      return true
    }
    let userEventRole = event.acl[userId]
    if (typeof userEventRole === 'object') {
      userEventRole = userEventRole.role
    }
    const userRoleHasPermission = rolesWithPermission(eventPermission).some(role => role === userEventRole)
    return userRoleHasPermission
  }

  /**
   * Check whether the given user is a member of any of the given MAGE event's
   * teams.
   * TODO: This is arguably an entity-layer function, but is here for now as
   * the concept of team membership only really has value in access control
   * decisions, currently.
   * @param event
   * @param userId
   * @returns
   */
  async userIsParticipantInEvent(event: MageEventAttrs | MageEventDocument, userId: UserId): Promise<boolean> {
    const teams = await this.resolveTeamsForEvent(event)
    return teams.some(team => team.userIds.indexOf(userId) !== -1)
  }

  private async resolveTeamsForEvent(event: MageEventAttrs | MageEventDocument): Promise<TeamMembership[]> {
    const teams = await this.eventRepo.findTeamsInEvent(event)
    return teams!
  }
}

export const defaultEventPermissionsService = new EventPermissionServiceImpl(new MongooseMageEventRepository(EventModel.Model))

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