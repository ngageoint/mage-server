import mongoose from 'mongoose'
import { RoleJson, RoleDocument } from './role'
import { UserIcon, Avatar, Phone } from '../entities/users/entities.users'
import { Authentication } from '../entities/authentication/entities.authentication'


export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId
  id: string
  username: string
  displayName: string
  email?: string
  phones: Phone[]
  avatar: Avatar
  icon: UserIcon
  active: boolean
  enabled: boolean
  roleId: mongoose.Types.ObjectId | RoleDocument
  authenticationId: mongoose.Types.ObjectId | mongoose.Document
  status?: string
  recentEventIds: number[]
  createdAt: Date
  lastUpdated: Date
  toJSON(): UserJson
}


// TODO: this probably needs an update now with new authentication changes
export type UserJson = Omit<UserDocument, '_id' | 'avatar' | 'roleId' | 'authenticationId' | keyof mongoose.Document>
  & {
    id: mongoose.Types.ObjectId,
    icon: Omit<UserIcon, 'relativePath'>,
    avatarUrl?: string,
  }
  & (RolePopulated | RoleReferenced)
  & (AuthenticationPopulated | AuthenticationReferenced)

export declare const Model: mongoose.Model<UserDocument>

export function getUserById(id: mongoose.Types.ObjectId): ReturnType<mongoose.Model<UserDocument>['findById']>
export function getUserById(id: mongoose.Types.ObjectId, callback: (err: null | any, result: UserDocument | null) => any): void

type RoleReferenced = {
  roleId: string,
  role: never
}

type RolePopulated = {
  roleId: never,
  role: RoleJson
}

type AuthenticationPopulated = {
  authenticationId: never,
  authentication: Authentication
}

type AuthenticationReferenced = {
  authenticationId: string,
  authentication: never
}


