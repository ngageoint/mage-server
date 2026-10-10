import { AppResponse } from '../app.api.global'
import { EntityNotFoundError, InvalidInputError, PermissionDeniedError } from '../app.api.errors'
import { EventAccessType, EventRole } from '../../entities/events/entities.events'
import { User, UserId } from '../../entities/users/entities.users'
import { EventRequest } from './app.api.events'

export type EventAclUser = Pick<User, 'id' | 'username' | 'displayName' | 'email'>

export interface EventAclEntry {
  user: EventAclUser
  role: EventRole
  permissions: EventAccessType[]
}

export type EventAclError = PermissionDeniedError | EntityNotFoundError | InvalidInputError

export interface ListEventAclRequest extends EventRequest {}

export interface ListEventAcl {
  (req: ListEventAclRequest): Promise<AppResponse<EventAclEntry[], PermissionDeniedError>>
}

export interface SetEventAclRoleRequest extends EventRequest {
  user: UserId
  role: EventRole
}

export interface SetEventAclRole {
  (req: SetEventAclRoleRequest): Promise<AppResponse<EventAclEntry[], EventAclError>>
}

export interface RemoveEventAclUserRequest extends EventRequest {
  user: UserId
}

export interface RemoveEventAclUser {
  (req: RemoveEventAclUserRequest): Promise<AppResponse<EventAclEntry[], EventAclError>>
}
