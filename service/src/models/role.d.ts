
import mongoose from 'mongoose'
import { AnyPermission } from '../entities/authorization/entities.permissions'

type Callback<R> = (err: any, result?: R) => any

export declare interface RoleDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  id: string
  name: string
  description?: string
  permissions: AnyPermission[]
}

export declare type RoleJson = Omit<RoleDocument, '_id'>

export declare function getRoleById(id: string, callback: Callback<RoleDocument | null>): void
export declare function getRole(name: string, callback: Callback<RoleDocument | null>): void
export declare function getRoles(callback: Callback<RoleDocument[]>): void
export declare function createRole(role: RoleDocument, callback: Callback<RoleDocument>): void
export declare function updateRole(id: string, update: Partial<RoleDocument>, callback: Callback<RoleDocument>): void
export declare function deleteRole(role: RoleDocument, callback: Callback<RoleDocument>): void
