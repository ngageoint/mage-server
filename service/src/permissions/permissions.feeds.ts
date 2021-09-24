import { FeedsPermissionService } from '../app.api/feeds/app.api.feeds'
import { PermissionDeniedError, permissionDenied } from '../app.api/app.api.errors'
import { AppRequestContext } from '../app.api/app.api.global'
import { FeedsPermission } from '../entities/authorization/entities.permissions'
import { FeedServiceId } from '../entities/feeds/entities.feeds'
import { UserWithRole, ensureContextUserHasPermission } from './permissions.role-based.base'


/**
 * This permission service relies on the user and role that the I/O adapter
 * layer has previously fetched from the database.
 */
export class PreFetchedUserRoleFeedsPermissionService implements FeedsPermissionService {

  async ensureListServiceTypesPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_LIST_SERVICE_TYPES)
  }

  async ensureCreateServicePermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_CREATE_SERVICE)
  }

  async ensureListServicesPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_LIST_SERVICES)
  }

  async ensureListTopicsPermissionFor(context: AppRequestContext<UserWithRole>, service: FeedServiceId): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_LIST_TOPICS)
  }

  async ensureCreateFeedPermissionFor(context: AppRequestContext<UserWithRole>, service: FeedServiceId): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_CREATE_FEED)
  }

  async ensureListAllFeedsPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return ensureContextUserHasPermission(context, FeedsPermission.FEEDS_LIST_ALL)
  }

  async ensureFetchFeedContentPermissionFor(context: AppRequestContext<UserWithRole>): Promise<PermissionDeniedError | null> {
    return permissionDenied(FeedsPermission.FEEDS_FETCH_CONTENT, context.requestingPrincipal().username)
  }
}
