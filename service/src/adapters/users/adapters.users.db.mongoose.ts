import { User, UserId, UserRepository, UserFindParameters, UserIcon, Avatar, UserRepositoryError, UserRepositoryErrorCode, UserExpanded } from '../../entities/users/entities.users'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import _ from 'lodash'
import mongoose from 'mongoose'
import { RoleDocument, RoleJson } from '../../models/role'
import { ObjectId } from 'bson'
import { Role } from '../../entities/authorization/entities.authorization'

export const UserModelName = 'User'

/**
 * This is the raw document structure that MongoDB stores, and that the
 * Mongoose/MongoDB driver retrieves without preforming any join-populate
 * operation with related models.
 */
export type UserDocument = Omit<User, 'id' | 'roleId'> & {
  _id: mongoose.Types.ObjectId,
  roleId: mongoose.Types.ObjectId,
}

export type UserExpandedDocument = Omit<UserDocument, 'roleId'>
  & { roleId: RoleDocument }

// TODO: users-next: this probably needs an update now with new authentication changes
export type UserJson = Omit<UserDocument, '_id' | 'avatar' | 'roleId' | keyof mongoose.Document>
  & {
    id: mongoose.Types.ObjectId,
    icon: Omit<UserIcon, 'relativePath'>,
    avatarUrl?: string,
  }
  & (RolePopulated | RoleReferenced)

type RoleReferenced = {
  roleId: string,
  role: never
}

type RolePopulated = {
  roleId: never,
  role: RoleJson
}

export type UserModel = mongoose.Model<UserDocument, object, object, object, mongoose.Schema<UserDocument>>
export type UserModelInstance = mongoose.HydratedDocument<UserDocument>
export type UserExpandedModelInstance = mongoose.HydratedDocument<UserDocument, { roleId: mongoose.HydratedDocument<RoleDocument> }>

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

export const UserSchema = new mongoose.Schema<UserDocument>(
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

// TODO: users-next: find references and delete
// UserSchema.virtual('authentication').get(function () {
//   return this.populated('authenticationId') ? this.authenticationId : null;
// });

// Lowercase the username we store, this will allow for case insensitive usernames
// Validate that username does not already exist
// TODO: users-next: properly set 409 statusj in web layer
// UserSchema.pre('save', function (next) {
//   const user = this;
//   user.username = user.username.toLowerCase();
//   this.model('User').findOne({ username: user.username }, function (err, possibleDuplicate) {
//     if (err) return next(err);
//     if (possibleDuplicate && !possibleDuplicate._id.equals(user._id)) {
//       const error = new Error('username already exists');
//       error.status = 409;
//       return next(error);
//     }
//     next();
//   });
// });

// TODO: users-next: this is business logic that belongs elsewhere
// UserSchema.pre('save', function (next) {
//   const user = this;
//   if (user.active === false || user.enabled === false) {
//     Token.removeTokensForUser(user, function (err) {
//       next(err);
//     });
//   } else {
//     next();
//   }
// });

// TODO: users-next: move to app/service layer
// UserSchema.pre('remove', function (next) {
//   const user = this;

//   async.parallel({
//     location: function (done) {
//       Location.removeLocationsForUser(user, done);
//     },
//     cappedlocation: function (done) {
//       CappedLocation.removeLocationsForUser(user, done);
//     },
//     token: function (done) {
//       Token.removeTokensForUser(user, done);
//     },
//     login: function (done) {
//       Login.removeLoginsForUser(user, done);
//     },
//     observation: function (done) {
//       Observation.removeUser(user, done);
//     },
//     eventAcl: function (done) {
//       Event.removeUserFromAllAcls(user, function (err) {
//         done(err);
//       });
//     },
//     teamAcl: function (done) {
//       Team.removeUserFromAllAcls(user, done);
//     },
//     authentication: function (done) {
//       Authentication.removeAuthenticationById(user.authenticationId, done);
//     }
//   },
//     function (err) {
//       next(err);
//     });
// });

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
    // TODO: users-next: this belongs in the web layer only
    userOut.avatarUrl = [(options.path ? options.path : ""), "api", "users", user._id, "avatar"].join("/");
  }

  if (user.icon && user.icon.relativePath) {
    // TODO: users-next: this belongs in the web layer only
    userOut.iconUrl = [(options.path ? options.path : ""), "api", "users", user._id, "icon"].join("/");
  }

  return userOut;
}

export function UserModel(conn: mongoose.Connection): UserModel {
  return conn.model(UserModelName, UserSchema, 'users')
}

/**
 * Return the string value of the MongoDB ObjectID or Mongoose document's ID.
 */
const idString = (x: mongoose.Document | mongoose.Types.ObjectId): string => {
  const id: mongoose.Types.ObjectId = x instanceof mongoose.Document ? x._id : x
  return id.toHexString()
}

type EntityTypeForDocType<DocType> = DocType extends UserExpandedDocument | UserExpandedModelInstance ? UserExpanded : User

function entityForDoc<DocType extends UserDocument | UserModelInstance | UserExpandedDocument | UserExpandedModelInstance>(from: DocType): EntityTypeForDocType<DocType> {
  const doc = from instanceof mongoose.Document ? from.toObject() : from
  const entity: any = {
    ...doc,
    id: from._id.toHexString(),
  }
  if (doc.roleId instanceof ObjectId) {
    entity.roleId = idString(doc.roleId)
    return entity
  }
  const { _id: docRoleId, ...partialRole } = doc.roleId
  const roleId = docRoleId.toHexString()
  entity.roleId = roleId
  entity.role =  { ...partialRole, id: roleId }
  return entity
}

export class MongooseUserRepository implements UserRepository {

  private baseRepo: BaseMongooseRepository<UserDocument, UserModel, User>

  constructor(private model: UserModel) {
    this.baseRepo = new BaseMongooseRepository<UserDocument, UserModel, User>(model, { docToEntity: entityForDoc })
  }

  findById(id: string): Promise<UserExpanded | null> {
    return this.model.findById<UserExpandedDocument>(id, null, { populate: 'roleId', lean: true }).then(x => x ? entityForDoc(x) : null)
  }

  findAllByIds(ids: string[]): Promise<{ [id: string]: User | null }> {
    return this.baseRepo.findAllByIds(ids)
  }

  async create(attrs: Omit<User, 'id' | 'icon' | 'avatar'>): Promise<UserExpanded | UserRepositoryError> {
    try {
      const userOrm = await this.model.create(attrs)
      const userExpandedDoc = await userOrm.populate<Pick<UserExpandedModelInstance, 'roleId'>>('roleId') as UserExpandedModelInstance
      return entityForDoc(userExpandedDoc)
    }
    catch (err) {
      // TODO: duplicate username error
      return new UserRepositoryError(UserRepositoryErrorCode.StorageError, String(err))
    }
  }

  async update(attrs: Partial<User> & { id: UserId }): Promise<User | null> {
    throw new Error('method not allowed')
  }

  async removeById(id: UserId): Promise<User | null> {
    throw new Error('method not allowed')
  }

  async findByUsername(username: string): Promise<UserExpanded | null> {
    const doc = await this.model.findOne<UserExpandedDocument>({ username }, null, { populate: 'roleId', lean: true })
    if (doc) {
      return entityForDoc(doc)
    }
    return null
  }

  async find<T = User>(which: UserFindParameters, mapping?: (x: User) => T): Promise<PageOf<T>> {
    const { nameOrContactTerm, active, enabled } = (which || {})
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
      params.active = which.active
    }
    if (typeof enabled === 'boolean') {
      params.enabled = which.enabled
    }
    const baseQuery = this.model.find(params).sort('displayName _id')
    const counted = await pageQuery(baseQuery, which)
    const users: T[] = []
    if (!mapping) {
      mapping = (x: User): T => (x as any as T)
    }
    for await (const userDoc of counted.query.cursor()) {
      users.push(mapping(entityForDoc(userDoc)))
    }
    return pageOf(users, which, counted.totalCount)
  }

  saveMapIcon(userId: UserId, icon: UserIcon, content: NodeJS.ReadableStream | Buffer): Promise<User | UserRepositoryError> {
    throw new Error('Method not implemented.')
  }

  saveAvatar(userId: UserId, avatar: Avatar, content: NodeJS.ReadableStream | Buffer): Promise<User | UserRepositoryError> {
    throw new Error('Method not implemented.')
  }

  deleteMapIcon(userId: UserId): Promise<User | UserRepositoryError> {
    throw new Error('Method not implemented.')
  }

  deleteAvatar(userId: UserId): Promise<User | UserRepositoryError> {
    throw new Error('Method not implemented.')
  }
}
