/**
 * Module dependencies.
 */

import express from 'express'
import { AnyPermission } from '../entities/authorization/entities.permissions'
import { RoleDocument } from '../models/role'
import { UserDocument } from '../models/user'

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
      if (!req.user) {
        return next()
      }
      const role = req.user.roleId as RoleDocument
      if (!role) {
        return res.sendStatus(403)
      }
      const userPermissions = role.permissions
      const ok = userPermissions.indexOf(permission) !== -1
      if (!ok) {
        return res.sendStatus(403)
      }
      next()
    }
  },

  userHasPermission(user: UserDocument, permission: AnyPermission) {
    if (!user || !user.roleId) {
      return false
    }
    const role = user.roleId as RoleDocument
    return role.permissions.indexOf(permission) !== -1
  }
})
