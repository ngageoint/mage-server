/**
 * Module dependencies.
 */

import express from 'express'
import { AnyPermission } from '../entities/authorization/entities.permissions'
import { UserExpanded } from '../entities/users/entities.users'

export = Object.freeze({

  /**
   * Return an Express.js middleware function that checks for the given
   * permission on the requesting user's role.  The request does not have a
   * user, the middleware will simply delegate to the next middleware in the
   * queue.  If the requesting user does not have the given permission, send
   * a 403 status and text response.
   * @param permission
   * @returns
   */
  authorize(permission: AnyPermission): express.RequestHandler {
    return function(req, res, next): any {
      if (!req.user?.admitted) {
        return next()
      }
      const userPermissions = req.user.admitted.account.role.permissions
      if (userPermissions.includes(permission)) {
        return next()
      }
      return res.sendStatus(403)
    }
  },

  // TODO: users-next
  userHasPermission(user: UserExpanded | null | undefined, permission: AnyPermission): boolean {
    const role = user?.role
    return role ? role.permissions.indexOf(permission) !== -1 : false
  }
})
