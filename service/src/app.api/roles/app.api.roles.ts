import { EntityNotFoundError, InfrastructureError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { Role, RoleId } from '../../entities/authorization/entities.authorization'
import { UserWithRole } from '../../permissions/permissions.role-based.base'

export interface RoleRequestContext<Principal = UserWithRole> extends AppRequestContext<Principal> {}

export interface RoleRequest<Principal = UserWithRole> extends AppRequest<Principal, RoleRequestContext<Principal>> {}

export type ExoRole = Role

export interface ReadRolesRequest extends RoleRequest {}

export interface ReadRoles {
  (req: ReadRolesRequest): Promise<AppResponse<ExoRole[], PermissionDeniedError | InfrastructureError>>
}

export interface ReadRoleRequest extends RoleRequest {
  roleId: RoleId
}

export interface ReadRole {
  (req: ReadRoleRequest): Promise<AppResponse<ExoRole, PermissionDeniedError | EntityNotFoundError | InfrastructureError>>
}

export interface CreateRoleRequest extends RoleRequest {
  role: {
    name: string
    description?: string
    permissions: string[]
  }
}

export interface CreateRole {
  (req: CreateRoleRequest): Promise<AppResponse<ExoRole, PermissionDeniedError | InvalidInputError | InfrastructureError>>
}

export interface UpdateRoleRequest extends RoleRequest {
  roleId: RoleId
  update: Partial<{
    name: string
    description: string
    permissions: string[]
  }>
}

export interface UpdateRole {
  (req: UpdateRoleRequest): Promise<AppResponse<ExoRole, PermissionDeniedError | EntityNotFoundError | InvalidInputError | InfrastructureError>>
}

export interface DeleteRoleRequest extends RoleRequest {
  roleId: RoleId
}

export interface DeleteRole {
  (req: DeleteRoleRequest): Promise<AppResponse<ExoRole, PermissionDeniedError | EntityNotFoundError | InfrastructureError>>
}

export interface RolePermissionService {
  ensureReadRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError>
  ensureCreateRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError>
  ensureUpdateRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError>
  ensureDeleteRolePermission(context: RoleRequestContext): Promise<null | PermissionDeniedError>
}
