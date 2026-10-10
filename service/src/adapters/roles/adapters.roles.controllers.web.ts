import express from 'express'
import { compatibilityMageAppErrorHandler, WebAppRequestFactory } from '../adapters.controllers.web'
import { invalidInput, InvalidInputError, MageError } from '../../app.api/app.api.errors'
import { CreateRole, DeleteRole, ReadRole, ReadRoles, RoleRequest, UpdateRole } from '../../app.api/roles/app.api.roles'
import { UserWithRole } from '../../permissions/permissions.role-based.base'

/**
 * Express adapter for the Role use cases in app.impl/roles/app.impl.roles.ts.
 * Exposes CRUD over /api/roles: parses/validates the HTTP request into the
 * app.api/roles request shapes, invokes the corresponding RoleAppLayer
 * function, and translates the AppResponse back into an HTTP response
 * Replaces the old routes/roles.js
 */

export interface RoleAppLayer {
  readRoles: ReadRoles
  readRole: ReadRole
  createRole: CreateRole
  updateRole: UpdateRole
  deleteRole: DeleteRole
}

export function RoleRoutes(app: RoleAppLayer, createAppRequest: WebAppRequestFactory<RoleRequest<UserWithRole>>): express.Router {

  const routes = express.Router().use(express.json())

  routes.route('/')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req)
      const appRes = await app.readRoles(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
    .post(async (req, res, next) => {
      const role = parseRoleBody(req.body)
      if (role instanceof MageError) {
        return next(role)
      }
      const appReq = createAppRequest(req, { role })
      const appRes = await app.createRole(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  routes.route('/:roleId')
    .get(async (req, res, next) => {
      const appReq = createAppRequest(req, { roleId: req.params.roleId })
      const appRes = await app.readRole(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
    .put(async (req, res, next) => {
      const update = parseRoleUpdateBody(req.body)
      const appReq = createAppRequest(req, { roleId: req.params.roleId, update })
      const appRes = await app.updateRole(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })
    .delete(async (req, res, next) => {
      const appReq = createAppRequest(req, { roleId: req.params.roleId })
      const appRes = await app.deleteRole(appReq)
      if (appRes.success) {
        return res.json(appRes.success)
      }
      next(appRes.error)
    })

  return routes.use(compatibilityMageAppErrorHandler)
}

function parseRoleBody(body: any): { name: string, description?: string, permissions: string[] } | InvalidInputError {
  if (!body || typeof body.name !== 'string' || !body.name) {
    return invalidInput("cannot create role: 'name' param not specified", ['name'])
  }
  return {
    name: body.name,
    description: typeof body.description === 'string' ? body.description : undefined,
    permissions: parsePermissions(body.permissions)
  }
}

function parseRoleUpdateBody(body: any): { name?: string, description?: string, permissions?: string[] } {
  const update: { name?: string, description?: string, permissions?: string[] } = {}
  if (typeof body?.name === 'string') {
    update.name = body.name
  }
  if (typeof body?.description === 'string') {
    update.description = body.description
  }
  if (body?.permissions !== undefined) {
    update.permissions = parsePermissions(body.permissions)
  }
  return update
}

function parsePermissions(permissions: unknown): string[] {
  if (Array.isArray(permissions)) {
    return permissions
  }
  if (typeof permissions === 'string') {
    return permissions.split(',')
  }
  return []
}
