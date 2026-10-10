import { AppRequest, AppRequestContext, AppResponse } from '../app.api.global'
import { EntityNotFoundError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { EventAccessType, EventRole, MageEvent } from '../../entities/events/entities.events'
import { User, UserId } from '../../entities/users/entities.users'

export type EventAclUser = Pick<User, 'id' | 'username' | 'displayName' | 'email'>

export interface EventAclEntry {
  user: EventAclUser
  role: EventRole
  permissions: EventAccessType[]
}

export type EventAclError = PermissionDeniedError | EntityNotFoundError | InvalidInputError

export interface EventAclRequestContext<Principal = unknown> extends AppRequestContext<Principal> {
  mageEvent: MageEvent
}

export interface EventAclRequest<Principal = unknown> extends AppRequest<Principal, EventAclRequestContext<Principal>> {}

export interface ListEventAclRequest extends EventAclRequest {}

export interface ListEventAcl {
  (req: ListEventAclRequest): Promise<AppResponse<EventAclEntry[], PermissionDeniedError>>
}

export interface SetEventAclRoleRequest extends EventAclRequest {
  user: UserId
  role: EventRole
}

export interface SetEventAclRole {
  (req: SetEventAclRoleRequest): Promise<AppResponse<EventAclEntry[], EventAclError>>
}

export interface RemoveEventAclUserRequest extends EventAclRequest {
  user: UserId
}

export interface RemoveEventAclUser {
  (req: RemoveEventAclUserRequest): Promise<AppResponse<EventAclEntry[], EventAclError>>
}
