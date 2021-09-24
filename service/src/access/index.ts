/**
 * Module dependencies.
 */

import express from 'express'
import { AnyPermission } from '../entities/authorization/entities.permissions'
import { RoleDocument } from '../models/role'
import { UserDocument } from '../models/user'

export = Object.freeze({

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
