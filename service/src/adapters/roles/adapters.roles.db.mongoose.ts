import mongoose from 'mongoose'
import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { Role, RoleRepository } from '../../entities/authorization/entities.authorization'

/**
 * Mongoose adapter for the Role entity: owns the RoleSchema/RoleModel and implements
 * RoleRepository against it. models/role.js bridges the legacy callback API
 * onto this repository for callers (migrations, auth strategies, old
 * routes) not yet migrated to the new architecture.
 */

const Schema = mongoose.Schema

export const RoleModelName = 'Role'

export interface RoleDocument {
  name: string
  description?: string
  permissions: string[]
}

export type RoleModelInstance = mongoose.HydratedDocument<RoleDocument>

export type RoleModel = mongoose.Model<RoleDocument>

export const RoleSchema = new Schema<RoleDocument, RoleModel>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: false },
    permissions: [Schema.Types.String]
  },
  {
    versionKey: false,
    toJSON: { transform },
    toObject: { transform }
  }
)

function transform(_doc: any, ret: any): any {
  ret.id = ret._id.toString()
  delete ret._id
  return ret
}

export function RoleModel(conn: mongoose.Connection, collection?: string): RoleModel {
  return (conn.models[RoleModelName] as RoleModel) || conn.model<RoleDocument, RoleModel>(RoleModelName, RoleSchema, collection)
}

function docToRole(doc: RoleModelInstance): Role {
  return doc.toJSON<Role>()
}

export class MongooseRoleRepository extends BaseMongooseRepository<RoleDocument, RoleModel, Role> implements RoleRepository {

  constructor(model: RoleModel) {
    super(model, { docToEntity: docToRole })
  }

  async findByName(name: string): Promise<Role | null> {
    const doc = await this.model.findOne({ name })
    return doc ? docToRole(doc) : null
  }
}
