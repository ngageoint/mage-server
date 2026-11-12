"use strict";

import mongoose from 'mongoose'
import {
  LocalIdpDuplicateUsernameError,
  LocalIdpAccount,
  LocalIdpRepository,
  LocalIdpSecurityPolicy,
  duplicateUsernameError, defaultLocalIdpSecurityPolicy, LocalIdpAccountSeed
} from './local-idp.entities'
import { MongoServerError } from 'mongodb';

const Schema = mongoose.Schema

export type LocalIdpSecurityPolicyDocument = LocalIdpSecurityPolicy & { _id: 1 }
export type LocalIdpSecurityPolicyModel = mongoose.Model<LocalIdpSecurityPolicyDocument>
export const LocalIdpSecurityPolicySchema = new Schema<LocalIdpSecurityPolicyDocument>({
  _id: { type: Number, default: 1 },
  passwordRequirements: { type: mongoose.SchemaTypes.Mixed },
  accountLock: { type: mongoose.SchemaTypes.Mixed },
})

export type LocalIdpAccountDocument = Omit<LocalIdpAccount, 'id' | 'hashedPassword' | 'previousHashedPasswords'> & {
  _id: mongoose.Types.ObjectId
  password: string
  previousPasswords: string[]
}
export type LocalIdpAccountModel = mongoose.Model<LocalIdpAccountDocument>
export const LocalIdpAccountSchema = new Schema<LocalIdpAccountDocument>(
  {
    username: { type: String, required: true, unique: true },
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
    timestamps: {
      createdAt: true,
      updatedAt: 'lastUpdated'
    }
  }
)

export function createLocalIdpModels(conn: mongoose.Connection): { securityPolicy: LocalIdpSecurityPolicyModel, account: LocalIdpAccountModel } {
  return {
    securityPolicy: conn.model('local-idp.security-policy', LocalIdpSecurityPolicySchema),
    account: conn.model('local-idp.account', LocalIdpAccountSchema),
  }
}

function policyEntityForDoc(doc: LocalIdpSecurityPolicyDocument): LocalIdpSecurityPolicy {
  return {
    accountLock: { ...doc.accountLock },
    passwordRequirements: { ...doc.passwordRequirements }
  }
}

function policyDocForEntity(entity: LocalIdpSecurityPolicy): LocalIdpSecurityPolicyDocument {
  const lock = entity.accountLock
  const pwr = entity.passwordRequirements
  return {
    _id: 1,
    accountLock: {
      enabled: lock.enabled,
      disableAfterLockCount: lock.disableAfterLockCount,
      lockAfterInvalidLoginCount: lock.lockAfterInvalidLoginCount,
      lockDurationSeconds: lock.lockDurationSeconds,
    },
    passwordRequirements: {
      highLetters: pwr.highLetters,
      highLettersEnabled: pwr.highLettersEnabled,
      lowLetters: pwr.lowLetters,
      lowLettersEnabled: pwr.lowLettersEnabled,
      maxConChars: pwr.maxConChars,
      maxConCharsEnabled: pwr.maxConCharsEnabled,
      minChars: pwr.minChars,
      minCharsEnabled: pwr.minCharsEnabled,
      numbers: pwr.numbers,
      numbersEnabled: pwr.numbersEnabled,
      passwordHistoryCount: pwr.passwordHistoryCount,
      passwordHistoryCountEnabled: pwr.passwordHistoryCountEnabled,
      passwordMinLength: pwr.passwordMinLength,
      passwordMinLengthEnabled: pwr.passwordMinLengthEnabled,
      restrictSpecialChars: pwr.restrictSpecialChars,
      restrictSpecialCharsEnabled: pwr.restrictSpecialCharsEnabled,
      specialChars: pwr.specialChars,
      specialCharsEnabled: pwr.specialCharsEnabled,
      helpText: pwr.helpText,
    }
  }
}

function accountEntityForDoc(doc: LocalIdpAccountDocument): LocalIdpAccount {
  return {
    id: doc._id.toHexString(),
    username: doc.username,
    createdAt: doc.createdAt,
    lastUpdated: doc.lastUpdated,
    hashedPassword: doc.password,
    previousHashedPasswords: [ ...doc.previousPasswords ],
    security: { ...doc.security }
  }
}

// TODO: verify desired behavior for this mapping
function accountDocForEntity(entity: Partial<LocalIdpAccount>): Partial<LocalIdpAccountDocument> {
  const hasKey = (key: keyof LocalIdpAccount): boolean => Object.prototype.hasOwnProperty.call(entity, key)
  const doc: Partial<LocalIdpAccountDocument> = {}
  if (hasKey('id')) {
    doc._id = new mongoose.Types.ObjectId(entity.id)
  }
  if (hasKey('username')) {
    doc.username = entity.username
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

export class MongooseLocalIdpRepository implements LocalIdpRepository {

  #accountModel: LocalIdpAccountModel
  #policyModel: LocalIdpSecurityPolicyModel

  /**
   * The policy model must reference a separate singleton collection, as only one policy document can exist.
   */
  constructor(policyModel: LocalIdpSecurityPolicyModel, accountModel: LocalIdpAccountModel) {
    this.#policyModel = policyModel
    this.#accountModel = accountModel
  }

  async saveSecurityPolicy(policy: LocalIdpSecurityPolicy): Promise<LocalIdpSecurityPolicy> {
    const policyDoc = policyDocForEntity(policy)
    const policyHydoc = new this.#policyModel(policyDoc)
    await policyHydoc.save()
    return policyEntityForDoc(policyHydoc)
  }

  async readSecurityPolicy(): Promise<LocalIdpSecurityPolicy> {
    const policyDoc = await this.#policyModel.findOne({ _id: 1 })
    if (policyDoc) {
      return policyEntityForDoc(policyDoc)
    }
    return await this.saveSecurityPolicy(defaultLocalIdpSecurityPolicy)
  }

  async createLocalAccount(account: LocalIdpAccountSeed): Promise<LocalIdpAccount | LocalIdpDuplicateUsernameError> {
    const doc = accountDocForEntity(account)
    try {
      const created = await this.#accountModel.create(doc)
      return accountEntityForDoc(created)
    }
    catch (err) {
      const ErrType = MongoServerError
      if (err instanceof ErrType) {
        if (err.code === 11000 && err.keyPattern.username) {
          return duplicateUsernameError(account.username)
        }
      }
      console.error('error creating local idp account', account.username, err)
      throw err
    }
  }

  async readLocalAccount(username: string): Promise<LocalIdpAccount | null> {
    const doc = await this.#accountModel.findOne({ username }, null, { lean: true })
    if (doc) {
      return accountEntityForDoc(doc)
    }
    return null
  }

  async updateLocalAccount(update: Partial<LocalIdpAccount> & Pick<LocalIdpAccount, 'username'>): Promise<LocalIdpAccount | null> {
    throw new Error('Method not implemented.')
  }

  async deleteLocalAccount(username: string): Promise<LocalIdpAccount | null> {
    const deleted = await this.#accountModel.findOneAndDelete({ username })
    return deleted ? accountEntityForDoc(deleted) : null
  }
}
