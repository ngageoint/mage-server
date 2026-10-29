import _ from 'lodash'
import mongoose from 'mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import {
  Avatar, Phone,
  User,
  UserAccountSeed,
  UserCreateResult,
  UserFindParameters, UserIcon,
  UserId,
  UserRepository
} from '../../entities/users/entities.users'
import * as legacy from '../../models/user'
import { UserModelInstance } from '../../models/user'
import { pageQuery } from '../base/adapters.base.db.mongoose'

export const UserModelName = 'User'

export type UserDocument = legacy.UserDocument
export type UserModel = mongoose.Model<UserDocument>
export const UserSchema = legacy.Model.schema

const idString = (x: { _id: mongoose.Types.ObjectId } | mongoose.Types.ObjectId): string => {
  const id: mongoose.Types.ObjectId = x instanceof mongoose.Types.ObjectId ? x : x._id
  return id.toHexString()
}

function entityForDocument(doc: UserDocument): User {
  return {
    id: idString(doc),
    username: doc.username,
    displayName: doc.displayName,
    active: doc.active,
    enabled: doc.enabled,
    createdAt: doc.createdAt,
    lastUpdated: doc.lastUpdated,
    ...(doc.email ? { email: doc.email } : {} ),
    ...(doc.status ? { status: doc.status } : {}),
    icon: iconEntityForDocument(doc.icon),
    avatar: avatarEntityForDocument(doc.avatar),
    phones: doc.phones.map(phoneEntityForDocument),
    roleId: idString(doc.roleId),
    authenticationId: idString(doc.authenticationId)
  }
}

export { entityForDocument as userEntityForDocument }

function phoneEntityForDocument(doc: Phone): Phone{
  return { type: doc.type, number: doc.number }
}

function iconEntityForDocument(doc: UserDocument['icon']): UserIcon | null {
  const entity = doc ? {
    ...(doc.type ? { type: doc.type } : {}),
    ...(doc.color ? { color: doc.color } : {}),
    ...(doc.text ? { text: doc.text } : {}),
    ...(doc.size ? { size: doc.size } : {}),
    ...(doc.color ? { color: doc.color } : {}),
    ...(doc.contentType ? { content: doc.contentType } : {}),
    ...(doc.relativePath ? { relativePath: doc.relativePath } : {}),
  } : doc
  return entity && Object.keys(entity).length ? entity as UserIcon : null
}

function avatarEntityForDocument(doc: UserDocument['avatar']): Avatar | null {
  const entity = doc ? {
    ...(doc.relativePath ? { relativePath: doc.relativePath } : {}),
    ...(typeof doc.size === 'number' ? { size: doc.size } : {}),
    ...(doc.contentType ? { contentType: doc.contentType } : {})
  } : doc
  return entity && Object.keys(entity).length ? entity as Avatar : null
}

export class MongooseUserRepository implements UserRepository {

  #model: mongoose.Model<UserDocument>

  constructor(model: mongoose.Model<UserDocument>) {
    this.#model = model
  }

  async createUser(account: UserAccountSeed): Promise<UserCreateResult> {
    throw new Error('unimplemented')
  }

  async update(attrs: Partial<User> & { id: UserId }): Promise<User | null> {
    throw new Error('method not allowed')
  }

  async removeById(id: any): Promise<User | null> {
    throw new Error('method not allowed')
  }

  async find<T = User>(which: UserFindParameters, mapping?: (x: User) => T): Promise<PageOf<T>> {
    const { nameOrContactTerm, active, enabled } = which || {}
    const searchRegex = new RegExp(_.escapeRegExp(nameOrContactTerm), 'i')
    const params = nameOrContactTerm ? {
      $or: [
        { username: searchRegex },
        { displayName: searchRegex },
        { email: searchRegex },
        { 'phones.number': searchRegex }
      ]
    } : {} as any
    if (typeof active === 'boolean') {
      params.active = active
    }
    if (typeof enabled === 'boolean') {
      params.enabled = enabled
    }
    const baseQuery = this.#model.find<UserModelInstance>(params).sort('displayName _id')
    const counted = await pageQuery(baseQuery, which)
    const users: T[] = []
    if (!mapping) {
      mapping = (x: User): T => (x as any as T)
    }
    for await (const userDoc of counted.query.cursor()) {
      users.push(mapping(entityForDocument(userDoc)))
    }
    return pageOf(users, which, counted.totalCount)
  }

  async findById(id: UserId): Promise<User | null> {
    const doc = await this.#model.findById(id)
    if (doc) {
      return entityForDocument(doc)
    }
    return null
  }

  async findAllByIds(ids: UserId[]): Promise<Record<UserId, User | null>> {
    if (!ids.length) {
      return {} as any
    }
    const notFound = ids.reduce((notFound, id) => {
      notFound[id] = null
      return notFound
    }, {} as any)
    const docs = await this.#model.find({ _id: { $in: ids } })
    const found = {} as Record<UserId, User | null>
    for (const doc of docs) {
      found[doc.id] = entityForDocument(doc)
      delete notFound[doc.id]
    }
    return { ...notFound, ...found }
  }
}
