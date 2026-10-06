import { Acl, EventRole, MageEventId } from './entities.events'
import { UserId } from '../users/entities.users'

/**
 * Persistence for the access control list of a Mage event.  The event ACL
 * determines which users can read, update, and delete an event, independent of
 * event team membership.
 */
export interface EventAclRepository {
  /**
   * Add the given user to the event ACL with the given role, or change the
   * user's role if the user is already in the ACL.  Return the updated ACL, or
   * null if the event does not exist.
   */
  setUserRole(event: MageEventId, user: UserId, role: EventRole): Promise<Acl | null>
  /**
   * Remove the given user from the event ACL.  Return the updated ACL, or null
   * if the event does not exist.
   */
  removeUser(event: MageEventId, user: UserId): Promise<Acl | null>
}
