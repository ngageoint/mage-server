import { entityNotFound, infrastructureError, invalidInput, InvalidInputError } from '../../app.api/app.api.errors'
import { AppResponse } from '../../app.api/app.api.global'
import * as api from '../../app.api/roles/app.api.roles'
import { RoleRepository } from '../../entities/authorization/entities.authorization'
import { allPermissions } from '../../entities/authorization/entities.permissions'

export interface RemoveRoleFromUsers {
  (roleId: string): Promise<void>
}

function validatePermissions(permissions: string[]): InvalidInputError | null {
  const invalid = permissions.filter(permission => !(allPermissions as Record<string, string>)[permission])
  if (invalid.length) {
    const summary = invalid.map(permission => `permission '${permission}' is not a valid permission`).join('; ')
    return invalidInput(summary, ...invalid.map(permission => ['permissions', permission] as [string, string]))
  }
  return null
}

export function ReadRoles(
  permissionService: api.RolePermissionService,
  repo: RoleRepository
): api.ReadRoles {
  return async function readRoles(req: api.ReadRolesRequest): ReturnType<api.ReadRoles> {
    const denied = await permissionService.ensureReadRolePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    try {
      const roles = await repo.findAll()
      return AppResponse.success(roles)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function ReadRole(
  permissionService: api.RolePermissionService,
  repo: RoleRepository
): api.ReadRole {
  return async function readRole(req: api.ReadRoleRequest): ReturnType<api.ReadRole> {
    const denied = await permissionService.ensureReadRolePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    try {
      const role = await repo.findById(req.roleId)
      if (!role) {
        return AppResponse.error(entityNotFound(req.roleId, 'Role'))
      }
      return AppResponse.success(role)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function CreateRole(
  permissionService: api.RolePermissionService,
  repo: RoleRepository
): api.CreateRole {
  return async function createRole(req: api.CreateRoleRequest): ReturnType<api.CreateRole> {
    const denied = await permissionService.ensureCreateRolePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    const invalid = validatePermissions(req.role.permissions)
    if (invalid) {
      return AppResponse.error(invalid)
    }
    try {
      const created = await repo.create(req.role)
      return AppResponse.success(created)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function UpdateRole(
  permissionService: api.RolePermissionService,
  repo: RoleRepository
): api.UpdateRole {
  return async function updateRole(req: api.UpdateRoleRequest): ReturnType<api.UpdateRole> {
    const denied = await permissionService.ensureUpdateRolePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    if (req.update.permissions) {
      const invalid = validatePermissions(req.update.permissions)
      if (invalid) {
        return AppResponse.error(invalid)
      }
    }
    try {
      const existing = await repo.findById(req.roleId)
      if (!existing) {
        return AppResponse.error(entityNotFound(req.roleId, 'Role'))
      }
      const updated = await repo.update({ ...req.update, id: req.roleId })
      return AppResponse.success(updated!)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}

export function DeleteRole(
  permissionService: api.RolePermissionService,
  repo: RoleRepository,
  removeRoleFromUsers: RemoveRoleFromUsers
): api.DeleteRole {
  return async function deleteRole(req: api.DeleteRoleRequest): ReturnType<api.DeleteRole> {
    const denied = await permissionService.ensureDeleteRolePermission(req.context)
    if (denied) {
      return AppResponse.error(denied)
    }
    try {
      const existing = await repo.findById(req.roleId)
      if (!existing) {
        return AppResponse.error(entityNotFound(req.roleId, 'Role'))
      }
      await removeRoleFromUsers(req.roleId)
      const removed = await repo.removeById(req.roleId)
      return AppResponse.success(removed!)
    } catch (err) {
      return AppResponse.error(infrastructureError(err instanceof Error ? err : String(err)))
    }
  }
}
