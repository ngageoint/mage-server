import mongoose from 'mongoose'
import { RoleJson } from './role'
import { UserIcon, Avatar, Phone } from '../entities/users/entities.users'
import { Authentication } from '../entities/authentication/entities.authentication'


export interface UserDocument {
  _id: mongoose.Types.ObjectId
  username: string
  displayName: string
  email?: string
  phones: Phone[]
  avatar: Avatar
  icon: UserIcon
  active: boolean
  enabled: boolean
  roleId: mongoose.Types.ObjectId
  authenticationId: mongoose.Types.ObjectId
  status?: string
  recentEventIds: number[]
  createdAt: Date
  lastUpdated: Date
}

export declare const Model: mongoose.Model<UserDocument>
export type UserModelInstance = mongoose.HydratedDocument<UserDocument>
export declare const Schema: mongoose.Schema<UserDocument>

export function getUserById(id: mongoose.Types.ObjectId): Promise<UserModelInstance | null>
export function getUserById(id: mongoose.Types.ObjectId, callback: (err: null | any, result: UserModelInstance | null) => any): void

type RoleReferenced = {
  roleId: string,
  role?: never
}

type RolePopulated = {
  roleId?: never,
  role: RoleJson
}

type AuthenticationPopulated = {
  authenticationId?: never,
  authentication: Authentication
}

type AuthenticationReferenced = {
  authenticationId: string,
  authentication?: never
}


