import { User, UserId, UserRepository, UserFindParameters } from '../../entities/users/entities.users'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import * as legacy from '../../models/user'
import _ from 'lodash'
import mongoose from 'mongoose'

export const UserModelName = 'User'

export type UserDocument = legacy.UserDocument
export type UserModel = mongoose.Model<UserDocument>
export const UserSchema = legacy.Model.schema

const idString = (x: mongoose.Document | mongoose.Types.ObjectId): string => {
  const id: mongoose.Types.ObjectId = x instanceof mongoose.Document ? x._id : x
  return id.toHexString()
}

export class MongooseUserRepository extends BaseMongooseRepository<UserDocument, UserModel, User> implements UserRepository {

  constructor(model: mongoose.Model<UserDocument>) {
    super(model, {
      docToEntity: doc => {
        const json = doc.toJSON()
        return {
          ...json,
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

    if (typeof which?.active === 'boolean') {
      params.active = which.active

    }
    if (typeof which?.enabled === 'boolean') {
      params.enabled = which.enabled
    }

    const baseQuery = this.model.find(params).sort('displayName _id')
    const counted = await pageQuery(baseQuery, which)
    const users: T[] = []
    if (!mapping) {
      mapping = (x: User) => (x as any as T)
    }
    for await (const userDoc of counted.query.cursor()) {
      users.push(mapping(this.entityForDocument(userDoc)))
    }

    const finalResult = pageOf(users, which, counted.totalCount);
    return finalResult;

  }
}