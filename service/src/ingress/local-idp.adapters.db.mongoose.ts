"use strict";

import mongoose from 'mongoose'
import { IdentityProviderDocument, IdentityProviderModel } from './ingress.adapters.db.mongoose'
import { LocalIdpDuplicateUsernameError, LocalIdpAccount, LocalIdpRepository, SecurityPolicy } from './local-idp.entities'

const Schema = mongoose.Schema

export type LocalIdpAccountDocument = Omit<LocalIdpAccount, 'id' | 'hashedPassword' | 'previousHashedPasswords'> & {
  /**
   * The _id is the username on the acccount.
   */
  _id: string
  password: string
  previousPasswords: string[]
}

export type LocalIdpAccountModel = mongoose.Model<LocalIdpAccountDocument>

// TODO: migrate from old authentication schema
export const LocalIdpAccountSchema = new Schema(
  {
    // TODO: users-next: migration to set username as _id
    _id: { type: String, required: true },
    password: { type: String, required: true },
    previousPasswords: { type: [String], default: [] },
    security: {
      locked: { type: Boolean, default: false },
      lockedUntil: { type: Date },
      invalidLoginAttempts: { type: Number, default: 0 },
      numberOfTimesLocked: { type: Number, default: 0 }
    }
  },
  {
    id: false,
    timestamps: {
      createdAt: true,
      updatedAt: 'lastUpdated'
    }
  }
)

// function DbLocalAuthenticationToObject(authIn, authOut, options) {
//   authOut = DbAuthenticationToObject(authIn, authOut, options)
//   delete authOut.password;
//   delete authOut.previousPasswords;
//   return authOut;
// }

// const SamlSchema = new Schema({});
// const LdapSchema = new Schema({});
// const OauthSchema = new Schema({});
// const OpenIdConnectSchema = new Schema({});

// AuthenticationSchema.method('validatePassword', function (password, callback) {
//   hasher.validPassword(password, this.password, callback);
// });

// Encrypt password before save
// LocalSchema.pre('save', function (next) {
//   const authentication = this;

//   // only hash the password if it has been modified (or is new)
//   if (!authentication.isModified('password')) {
//     return next();
//   }

//   async.waterfall([
//     function (done) {
//       AuthenticationConfiguration.getById(authentication.authenticationConfigurationId).then(localConfiguration => {
//         done(null, localConfiguration.settings.passwordPolicy);
//       }).catch(err => done(err));
//     },
//     function (policy, done) {
//       const { password, previousPasswords } = authentication;
//       PasswordValidator.validate(policy, { password, previousPasswords }).then(validationStatus => {
//         if (!validationStatus.valid) {
//           const err = new Error(validationStatus.errorMsg);
//           err.status = 400;
//           return done(err);
//         }

//         done(null, policy);
//       });
//     },
//     function (policy, done) {
//       hasher.hashPassword(authentication.password, function (err, password) {
//         done(err, policy, password);
//       });
//     }
//   ], function (err, policy, password) {
//     if (err) return next(err);

//     authentication.password = password;
//     authentication.previousPasswords.unshift(password);
//     authentication.previousPasswords = authentication.previousPasswords.slice(0, policy.passwordHistoryCount);
//     next();
//   });
// });

// Remove Token if password changed
// LocalSchema.pre('save', function (next) {
//   const authentication = this;

//   // only remove token if password has been modified (or is new)
//   if (!authentication.isModified('password')) {
//     return next();
//   }

//   async.waterfall([
//     function (done) {
//       // TODO: users-next
//       User.getUserByAuthenticationId(authentication._id, function (err, user) {
//         done(err, user);
//       });
//     },
//     function (user, done) {
//       if (user) {
//         Token.removeTokensForUser(user, function (err) {
//           done(err);
//         });
//       } else {
//         done();
//       }
//     }
//   ], function (err) {
//     return next(err);
//   });
// });

// exports.getAuthenticationByStrategy = function (strategy, uid, callback) {
//   if (callback) {
//     Authentication.findOne({ id: uid, type: strategy }, callback);
//   } else {
//     return Authentication.findOne({ id: uid, type: strategy });
//   }
// };

// exports.getAuthenticationsByType = function (type) {
//   return Authentication.find({ type: type }).exec();
// };

// exports.getAuthenticationsByAuthConfigId = function (authConfigId) {
//   return Authentication.find({ authenticationConfigurationId: authConfigId }).exec();
// };

// exports.countAuthenticationsByAuthConfigId = function (authConfigId) {
//   return Authentication.count({ authenticationConfigurationId: authConfigId }).exec();
// };

// exports.createAuthentication = function (authentication) {
//   const document = {
//     id: authentication.id,
//     type: authentication.type,
//     authenticationConfigurationId: authentication.authenticationConfigurationId,
//   }

//   if (authentication.type === 'local') {
//     document.password = authentication.password;
//     document.security ={
//       lockedUntil: null
//     }
//   }

//   return Authentication.create(document);
// };

// exports.updateAuthentication = function (authentication) {
//   return authentication.save();
// };

// exports.removeAuthenticationById = function (authenticationId, done) {
//   Authentication.findByIdAndRemove(authenticationId, done);
// };

function entityForDocument(doc: LocalIdpAccountDocument): LocalIdpAccount {
  return {
    username: doc._id,
    createdAt: doc.createdAt,
    lastUpdated: doc.lastUpdated,
    hashedPassword: doc.password,
    previousHashedPasswords: [ ...doc.previousPasswords ],
    security: { ...doc.security }
  }
}

// TODO: verify desired behavior for this mapping
function documentForEntity(entity: Partial<LocalIdpAccount>): Partial<LocalIdpAccountDocument> {
  const hasKey = (key: keyof LocalIdpAccount): boolean => Object.prototype.hasOwnProperty.call(entity, key)
  const doc: Partial<LocalIdpAccountDocument> = {}
  if (hasKey('username')) {
    doc._id = entity.username
  }
  if (hasKey('createdAt') && entity.createdAt) {
    doc.createdAt = new Date(entity.createdAt)
  }
  if (hasKey('lastUpdated') && entity.lastUpdated) {
    doc.lastUpdated = new Date(entity.lastUpdated)
  }
  if (hasKey('hashedPassword')) {
    doc.password = entity.hashedPassword
  }
  if (hasKey('previousHashedPasswords') && entity.previousHashedPasswords) {
    doc.previousPasswords = entity.previousHashedPasswords
  }
  if (hasKey('security') && entity.security) {
    doc.security = { ...entity.security }
  }
  return doc
}

function localIdpSecurityPolicyFromIdenityProvider(localIdp: IdentityProviderDocument): SecurityPolicy {
  const settings = localIdp.protocolSettings
  return {
    accountLock: { ...settings.accountLock },
    passwordRequirements: { ...settings.passwordPolicy }
  }
}

export class LocalIdpMongooseRepository implements LocalIdpRepository {

  constructor(private LocalIdpAccountModel: LocalIdpAccountModel, private IdentityProviderModel: IdentityProviderModel) {}

  async readSecurityPolicy(): Promise<SecurityPolicy> {
    const idpDoc = await this.IdentityProviderModel.findOne({ name: 'local' })
    if (idpDoc) {
      return localIdpSecurityPolicyFromIdenityProvider(idpDoc)
    }
    throw new Error('local identity provider not found')
  }

  async createLocalAccount(account: LocalIdpAccount): Promise<LocalIdpAccount | LocalIdpDuplicateUsernameError> {
    const doc = documentForEntity(account)
    const created = await this.LocalIdpAccountModel.create(doc)
    // TODO: handle duplicate username error
    return entityForDocument(created)
  }

  async readLocalAccount(username: string): Promise<LocalIdpAccount | null> {
    const doc = await this.LocalIdpAccountModel.findById(username, null, { lean: true })
    if (doc) {
      return entityForDocument(doc)
    }
    return null
  }

  updateLocalAccount(update: Partial<LocalIdpAccount> & Pick<LocalIdpAccount, 'username'>): Promise<LocalIdpAccount | null> {
    throw new Error('Method not implemented.')
  }

  deleteLocalAccount(username: string): Promise<LocalIdpAccount | null> {
    throw new Error('Method not implemented.')
  }
}