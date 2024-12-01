import mongoose from 'mongoose'
import { AnyPermission } from '../entities/authorization/entities.permissions'

type Callback<R> = (err: any, result?: R) => any

export declare interface RoleDocument {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
  permissions: AnyPermission[]
}

export type RoleModelInstance = mongoose.HydratedDocument<RoleDocument>

export declare type RoleJson = Omit<RoleDocument, '_id'>

export declare function getRoleById(id: string, callback: Callback<RoleModelInstance | null>): void
export declare function getRole(name: string, callback: Callback<RoleModelInstance | null>): void
export declare function getRoles(callback: Callback<RoleModelInstance[]>): void
export declare function createRole(role: Omit<RoleDocument, '_id'>, callback: Callback<RoleModelInstance>): void
export declare function updateRole(id: string, update: Partial<RoleDocument>, callback: Callback<RoleModelInstance>): void
export declare function deleteRole(role: RoleModelInstance, callback: Callback<RoleModelInstance>): void
