import mongoose from 'mongoose'
import { BaseMongooseRepository } from '../adapters/base/adapters.base.db.mongoose'
import { PagingParameters, PageOf } from '../entities/entities.global'
import { UserId } from '../entities/users/entities.users'
import { DeviceEnrollmentPolicy, IdentityProvider, IdentityProviderId, IdentityProviderMutableAttrs, IdentityProviderRepository, UserEnrollmentPolicy, UserIngressBinding, UserIngressBindings, UserIngressBindingsRepository } from './ingress.entities'

type ObjectId = mongoose.Types.ObjectId
const ObjectId = mongoose.Types.ObjectId
const Schema = mongoose.Schema

export type IdentityProviderDocument = Omit<IdentityProvider, 'id'> & {
  _id: ObjectId
}

export type IdentityProviderModel = mongoose.Model<IdentityProviderDocument>

export const IdentityProviderSchema = new Schema<IdentityProviderDocument>(
  {
    name: { type: String, required: true },
    protocol: { type: String, required: true },
    protocolSettings: Schema.Types.Mixed,
    userEnrollmentPolicy: {
      accountApprovalRequired: { type: Boolean, required: true, default: true },
      assignRole: { type: String, required: true },
      assignToEvents: { type: [Number], default: [] },
      assignToTeams: { type: [String], default: [] },
    },
    deviceEnrollmentPolicy: {
      deviceApprovalRequired: { type: Boolean, required: true, default: true },
    },
    title: { type: String, required: false },
    textColor: { type: String, required: false },
    buttonColor: { type: String, required: false },
    icon: { type: Buffer, required: false },
    enabled: { type: Boolean, default: true },
  },
  {
    timestamps: {
      updatedAt: 'lastUpdated'
    },
    versionKey: false,
  }
)

IdentityProviderSchema.index({ name: 1, type: 1 }, { unique: true })

export function idpEntityForDocument(doc: IdentityProviderDocument): IdentityProvider {
  const userEnrollmentPolicy: UserEnrollmentPolicy = { ...doc.userEnrollmentPolicy }
  const deviceEnrollmentPolicy: DeviceEnrollmentPolicy = { ...doc.deviceEnrollmentPolicy }
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    enabled: doc.enabled,
    lastUpdated: doc.lastUpdated,
    protocol: doc.protocol,
    title: doc.title || doc.name,
    protocolSettings: { ...doc.protocolSettings },
    textColor: doc.textColor,
    buttonColor: doc.buttonColor,
    icon: doc.icon,
    userEnrollmentPolicy,
    deviceEnrollmentPolicy,
  }
}

export function idpDocumentForEntity(entity: Partial<IdentityProvider>): Partial<IdentityProviderDocument> {
  const doc = {} as Partial<IdentityProviderDocument>
  const entityHasKey = (key: keyof IdentityProvider): boolean => Object.prototype.hasOwnProperty.call(entity, key)
  if (entityHasKey('id')) {
    doc._id = new mongoose.Types.ObjectId(entity.id)
  }
  if (entityHasKey('protocol')) {
    doc.protocol = entity.protocol
  }
  if (entityHasKey('protocolSettings')) {
    // TODO: maybe delegate to protocol to copy settings
    doc.protocolSettings = { ...entity.protocolSettings }
  }
  if (entityHasKey('userEnrollmentPolicy')) {
    doc.userEnrollmentPolicy = { ...entity.userEnrollmentPolicy! }
  }
  if (entityHasKey('deviceEnrollmentPolicy')) {
    doc.deviceEnrollmentPolicy = { ...entity.deviceEnrollmentPolicy! }
  }
  if (entityHasKey('buttonColor')) {
    doc.buttonColor = entity.buttonColor
  }
  if (entityHasKey('enabled')) {
    doc.enabled = entity.enabled
  }
  if (entityHasKey('icon')) {
    doc.icon = entity.icon
  }
  if (entityHasKey('lastUpdated')) {
    doc.lastUpdated = entity.lastUpdated ? new Date(entity.lastUpdated) : undefined
  }
  if (entityHasKey('name')) {
    doc.name = entity.name
  }
  if (entityHasKey('protocol')) {
    doc.protocol = entity.protocol
  }
  if (entityHasKey('textColor')) {
    doc.textColor = entity.textColor
  }
  if (entityHasKey('title')) {
    doc.title = entity.title
  }
  return doc
}

export class IdentityProviderMongooseRepository extends BaseMongooseRepository<IdentityProviderDocument, IdentityProviderModel, IdentityProvider> implements IdentityProviderRepository {

  constructor(model: IdentityProviderModel) {
    super(model, { docToEntity: idpEntityForDocument, entityToDocStub: idpDocumentForEntity })
  }

  findIdpById(id: string): Promise<IdentityProvider | null> {
    return super.findById(id)
  }

  async findIdpByName(name: string): Promise<IdentityProvider | null> {
    const doc = await this.model.findOne({ name }, null, { lean: true })
    if (doc) {
      return this.entityForDocument(doc)
    }
    return null
  }

  updateIdp(update: Partial<IdentityProviderMutableAttrs> & Pick<IdentityProvider, 'id'>): Promise<IdentityProvider | null> {
    return super.update(update)
  }

  deleteIdp(id: IdentityProviderId): Promise<IdentityProvider | null> {
    return super.removeById(id)
  }
}


export type UserIngressBindingsDocument = {
  /**
   * The ingress bindings `_id` is actually the `_id` of the related user document.
   */
  _id: ObjectId
  bindings: { [idpId: IdentityProviderId]: UserIngressBinding }
}

export type UserIngressBindingsModel = mongoose.Model<UserIngressBindingsDocument>

export const UserIngressBindingsSchema = new Schema<UserIngressBindingsDocument>(
  {
    bindings: { type: Schema.Types.Mixed, required: true }
  }
)

export class UserIngressBindingsMongooseRepository implements UserIngressBindingsRepository {

  constructor(readonly model: UserIngressBindingsModel) {}

  async readBindingsForUser(userId: UserId): Promise<UserIngressBindings | null> {
    const doc = await this.model.findById(userId, null, { lean: true })
    return doc ? { userId, bindingsByIdp: new Map(Object.entries(doc?.bindings || {})) } : null
  }

  async readAllBindingsForIdp(idpId: IdentityProviderId, paging?: PagingParameters | undefined): Promise<PageOf<UserIngressBindings>> {
    throw new Error('Method not implemented.')
  }

  async saveUserIngressBinding(userId: UserId, binding: UserIngressBinding): Promise<Error | UserIngressBindings> {
    const _id = new ObjectId(userId)
    const bindingsUpdate = { $set: { [`bindings.${binding.idpId}`]: binding } }
    const doc = await this.model.findOneAndUpdate({ _id }, bindingsUpdate, { upsert: true, new: true })
    return { userId, bindingsByIdp: new Map(Object.entries(doc.bindings)) }
  }

  async deleteBinding(userId: UserId, idpId: IdentityProviderId): Promise<UserIngressBinding | null> {
    const _id = new ObjectId(userId)
    const bindingsUpdate = { $unset: [`bindings.${idpId}`] }
    const doc = await this.model.findOneAndUpdate({ _id }, bindingsUpdate)
    return doc?.bindings[idpId] || null
  }

  async deleteBindingsForUser(userId: UserId): Promise<UserIngressBindings | null> {
    throw new Error('Method not implemented.')
  }

  async deleteAllBindingsForIdp(idpId: IdentityProviderId): Promise<number> {
    throw new Error('Method not implemented.')
  }
}

// TODO: should be per protocol and identity provider and in entity layer
const whitelist = ['name', 'type', 'title', 'textColor', 'buttonColor', 'icon'];
const blacklist = ['clientsecret', 'bindcredentials', 'privatecert', 'decryptionpvk'];
const secureMask = '*****';

function DbAuthenticationConfigurationToObject(config, ret, options) {
  delete ret.__v;

  if (options.whitelist) {
    if (config.type === 'local') {
      return;
    }

    Object.keys(ret).forEach(key => {
      if (!whitelist.includes(key)) {
        delete ret[key];
      }
    });
  }

  if (options.blacklist) {
    Object.keys(ret.settings).forEach(key => {
      if (blacklist.includes(key.toLowerCase())) {
        ret.settings[key] = secureMask;
      }
    });
  }

  ret.icon = ret.icon ? ret.icon.toString('base64') : null;
}

// TODO: move to api/web layer
function manageIcon(config) {
  if (config.icon) {
    if (config.icon.startsWith('data')) {
      config.icon = Buffer.from(config.icon.split(",")[1], "base64");
    } else {
      config.icon = Buffer.from(config.icon, 'base64');
    }
  } else {
    config.icon = null;
  }
}

// TODO: move to protocol
function manageSettings(config) {
  if (config.settings.scope) {
    if (!Array.isArray(config.settings.scope)) {
      config.settings.scope = config.settings.scope.split(',');
    }

    for (let i = 0; i < config.settings.scope.length; i++) {
      config.settings.scope[i] = config.settings.scope[i].trim();
    }
  }
}

//TODO move the 'manage' methods to a pre save method

// exports.create = function (config) {
//   manageIcon(config);
//   manageSettings(config);

//   return AuthenticationConfiguration.create(config);
// };

// exports.update = function (id, config) {
//   manageIcon(config);
//   manageSettings(config);

//   return AuthenticationConfiguration.findByIdAndUpdate(id, config, { new: true }).exec();
// };
