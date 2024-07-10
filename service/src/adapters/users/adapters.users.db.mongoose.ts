import { User, UserId, UserRepository, UserFindParameters, UserIcon } from '../../entities/users/entities.users'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import _ from 'lodash'
import mongoose from 'mongoose'
import { RoleDocument, RoleJson } from '../../models/role'
import { Authentication } from '../../entities/authentication/entities.authentication'

export const UserModelName = 'User'

export type UserDocumentAttrs = Omit<User, 'authenticationId' | 'id' | 'roleId'> & {
  _id: mongoose.Types.ObjectId,
  authenticationId: mongoose.Types.ObjectId,
  roleId: mongoose.Types.ObjectId,
}

export type UserDocument = mongoose.Document<mongoose.Types.ObjectId, any, UserDocumentAttrs> & {
  // _id: mongoose.Types.ObjectId
  // id: string
  // username: string
  // displayName: string
  // email?: string
  // phones: Phone[]
  // avatar: Avatar
  // icon: UserIcon
  // active: boolean
  // enabled: boolean
  // roleId: mongoose.Types.ObjectId | RoleDocument
  // authenticationId: mongoose.Types.ObjectId | mongoose.Document
  // status?: string
  // recentEventIds: number[]
  // createdAt: Date
  // lastUpdated: Date
  // toJSON(): UserJson
}

// TODO: this probably needs an update now with new authentication changes
export type UserJson = Omit<UserDocumentAttrs, '_id' | 'avatar' | 'roleId' | 'authenticationId' | keyof mongoose.Document>
  & {
    id: mongoose.Types.ObjectId,
    icon: Omit<UserIcon, 'relativePath'>,
    avatarUrl?: string,
  }
  & (RolePopulated | RoleReferenced)
  & (AuthenticationPopulated | AuthenticationReferenced)

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

export type UserModel = mongoose.Model<UserDocument>

export const UserPhoneSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    number: { type: String, required: true }
  },
  {
    versionKey: false,
    _id: false
  }
)

export const UserSchema = new mongoose.Schema<UserDocumentAttrs>(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    email: { type: String, required: false },
    phones: [ UserPhoneSchema ],
    avatar: {
      contentType: { type: String, required: false },
      size: { type: Number, required: false },
      relativePath: { type: String, required: false }
    },
    icon: {
      type: { type: String, enum: ['none', 'upload', 'create'], default: 'none' },
      text: { type: String },
      color: { type: String },
      contentType: { type: String, required: false },
      size: { type: Number, required: false },
      relativePath: { type: String, required: false }
    },
    active: { type: Boolean, required: true },
    enabled: { type: Boolean, default: true, required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    recentEventIds: [ { type: Number, ref: 'Event' } ],
    authenticationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authentication', required: true }
  },
  {
    versionKey: false,
    timestamps: {
      updatedAt: 'lastUpdated'
    },
    toObject: {
      transform: DbUserToObject
    },
    toJSON: {
      transform: DbUserToObject
    }
  }
)

UserSchema.virtual('authentication').get(function () {
  return this.populated('authenticationId') ? this.authenticationId : null;
});

// Lowercase the username we store, this will allow for case insensitive usernames
// Validate that username does not already exist
UserSchema.pre('save', function (next) {
  const user = this;
  user.username = user.username.toLowerCase();
  this.model('User').findOne({ username: user.username }, function (err, possibleDuplicate) {
    if (err) return next(err);

    if (possibleDuplicate && !possibleDuplicate._id.equals(user._id)) {
      const error = new Error('username already exists');
      error.status = 409;
      return next(error);
    }

    next();
  });
});

UserSchema.pre('save', function (next) {
  const user = this;
  if (user.active === false || user.enabled === false) {
    Token.removeTokensForUser(user, function (err) {
      next(err);
    });
  } else {
    next();
  }
});

UserSchema.pre('remove', function (next) {
  const user = this;

  async.parallel({
    location: function (done) {
      Location.removeLocationsForUser(user, done);
    },
    cappedlocation: function (done) {
      CappedLocation.removeLocationsForUser(user, done);
    },
    token: function (done) {
      Token.removeTokensForUser(user, done);
    },
    login: function (done) {
      Login.removeLoginsForUser(user, done);
    },
    observation: function (done) {
      Observation.removeUser(user, done);
    },
    eventAcl: function (done) {
      Event.removeUserFromAllAcls(user, function (err) {
        done(err);
      });
    },
    teamAcl: function (done) {
      Team.removeUserFromAllAcls(user, done);
    },
    authentication: function (done) {
      Authentication.removeAuthenticationById(user.authenticationId, done);
    }
  },
    function (err) {
      next(err);
    });
});

// eslint-disable-next-line complexity
function DbUserToObject(user, userOut, options) {
  userOut.id = userOut._id;
  delete userOut._id;

  delete userOut.avatar;

  if (userOut.icon) { // TODO remove if check, icon is always there
    delete userOut.icon.relativePath;
  }

  if (!!user.roleId && typeof user.roleId.toObject === 'function') {
    userOut.role = user.roleId.toObject();
    delete userOut.roleId;
  }

  /*
  TODO: this used to use user.populated('authenticationId'), but when paging
  and using the cursor(), mongoose was not setting the populated flag on the
  cursor documents, so this condition was never met and paged user documents
  erroneously retained the authenticationId key with the populated
  authentication object.  this occurs in mage server 6.2.x with mongoose 4.x.
  this might be fixed in mongoose 5+, so revisit on mage server 6.3.x.
  */
  if (!!user.authenticationId && typeof user.authenticationId.toObject === 'function') {
    const authPlain = user.authenticationId.toObject({ virtuals: true });
    delete userOut.authenticationId;
    userOut.authentication = authPlain;
  }

  if (user.avatar && user.avatar.relativePath) {
    // TODO, don't really like this, need a better way to set user resource, route
    userOut.avatarUrl = [(options.path ? options.path : ""), "api", "users", user._id, "avatar"].join("/");
  }

  if (user.icon && user.icon.relativePath) {
    // TODO, don't really like this, need a better way to set user resource, route
    userOut.iconUrl = [(options.path ? options.path : ""), "api", "users", user._id, "icon"].join("/");
  }

  return userOut;
};

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