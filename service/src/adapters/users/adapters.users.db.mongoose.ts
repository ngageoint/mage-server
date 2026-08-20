import mongoose from 'mongoose'
import { User, UserId, UserRepository, UserFindParameters } from '../../entities/users/entities.users'
import { UserModelInstance } from '../../models/user'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import * as legacy from '../../models/user'
import _ from 'lodash'

export const UserModelName = 'User'

export type UserDocument = legacy.UserDocument
export type UserModel = mongoose.Model<UserDocument>
export const UserSchema = legacy.Model.schema

const idString = (x: { _id: mongoose.Types.ObjectId } | mongoose.Types.ObjectId): string => {
  const id: mongoose.Types.ObjectId = x instanceof mongoose.Types.ObjectId ? x : x._id
  return id.toHexString()
}

export class MongooseUserRepository extends BaseMongooseRepository<UserDocument, UserModel, User> implements UserRepository {

  constructor(model: mongoose.Model<UserDocument>) {
    super(model, {
      docToEntity: doc => {
        const json = doc.toJSON()
        return {
          ...json,
          avatar: doc.avatar,
          id: doc._id.toHexString(),
          roleId: idString(doc.roleId),
          authenticationId: idString(doc.authenticationId)
        }
      }
    })
  }

  async create(): Promise<User> {
    throw new Error('method not allowed')
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
    const baseQuery = this.model.find<UserModelInstance>(params).sort('displayName _id')
    const counted = await pageQuery(baseQuery, which)
    const users: T[] = []
    if (!mapping) {
      mapping = (x: User): T => (x as any as T)
    }
    for await (const userDoc of counted.query.cursor()) {
      users.push(mapping(this.entityForDocument(userDoc)))
    }
    return pageOf(users, which, counted.totalCount)
  }

  async findById(id: UserId): Promise<User | null> {
    const doc = await this.model.findById(id)
    if (doc) {
      return this.entityForDocument(doc)
    }

    return null
  }
}
