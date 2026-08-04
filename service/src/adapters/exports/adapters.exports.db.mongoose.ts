import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { Export, ExportCreateAttrs, ExportId, ExportOptions, ExportStatus, ExportsRepository } from '../../entities/exports/entities.exports'
import mongoose, { Model, PopulatedDoc, Schema } from 'mongoose'
import { MageEvent } from '../../entities/events/entities.events'
import { UserDocument } from '../users/adapters.users.db.mongoose'
import { UserJson } from '../../models/user'
import { MageEventDocument } from '../events/adapters.events.db.mongoose'
import { UserId } from '../../entities/users/entities.users'

export type ExportDocument = Omit<Export, | 'userId' | 'options'> & mongoose.Document & {
  relativePath: string,
  filename: string,
  userId: PopulatedDoc<UserDocument> | null,
  options: Omit<ExportOptions, 'event'> & {
    eventId: PopulatedDoc<MageEventDocument> | null
  }
}

export type ExportModel = Model<ExportDocument>
export const ExportModelName = 'Export'

const ErrorSchema = new Schema({
  type: { type: String, required: false },
  message: { type: String, required: true }
}, {
  versionKey: false,
  _id: false,
  timestamps: true
})

export const ExportSchema = new mongoose.Schema<any>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  relativePath: { type: String },
  filename: { type: String },
  size: { type: Number, required: false },
  exportType: { type: String, required: true },
  status: {
    type: String,
    enum: [ExportStatus.Running, ExportStatus.Completed, ExportStatus.Failed],
    required: true
  },
  options: {
    eventId: { type: Number, ref: 'Event', required: true },
    filter: { type: Schema.Types.Mixed },
    projection: { type: Schema.Types.Mixed }
  },
  processingErrors: [ErrorSchema],
  expirationDate: { type: Date, required: true },
  summary: {
    observations: {
      count: { type: Number },
      startTimestamp: { type: Date },
      endTimestamp: { type: Date }
    },
    locations: {
      count: { type: Number },
      startTimestamp: { type: Date },
      endTimestamp: { type: Date }
    }
  }
},{
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  }
})

export function ExportModel(conn: mongoose.Connection, collection?: string): ExportModel {
  return conn.model(ExportModelName, ExportSchema, collection || 'exports') as any
}

export class MongooseExportsRepository extends BaseMongooseRepository<ExportDocument, ExportModel, Export> implements ExportsRepository {
  constructor(
    model: mongoose.Model<ExportDocument>,
    private readonly explortTtlMillis: number
  ) {
    super(model, {
      docToEntity: doc => {
        let user: UserJson | undefined
        if (doc.populated('userId') && doc.userId) {
          user = (doc.userId as UserDocument).toJSON()
        }

        let event: MageEvent | undefined
        if (doc.populated('options.eventId') && doc.options.eventId) {
          event = (doc.options.eventId as MageEventDocument).toJSON<MageEvent>({ flattenMaps: false })
        }

        const json = doc.toJSON<Export>()
        const {
          _id,
          userId,
          options: { eventId, ...strippedOptions },
          ...stripped
        } = json as unknown as ExportDocument

        return {
          ...stripped,
          id: _id.toHexString(),
          user,
          options: {
            ...strippedOptions,
            event
          }
        }
      }
    })
  }

  async getExports(): Promise<Export[]> {
    const documents = await this.model.find().sort({ _id: -1 }).exec()
    return documents.map(x => this.entityForDocument(x))
  }

  async getExportForUser(exportId: ExportId, userId: UserId): Promise<Export | null> {
    const document = await this.model
      .findOne({ _id: exportId, userId })
      .populate('userId').populate({ path: 'options.eventId', select: 'name' })

    if (!document) {
      return null
    }

    return this.entityForDocument(document)
  }

  async getExportsForUser(userId: string): Promise<Export[]> {
    const query = this.model
      .find({ userId })
      .populate('userId').populate({ path: 'options.eventId', select: 'name' })
      .sort({ _id: 'descending' })

    const documents = await query.exec()
    return documents.map(x =>  this.entityForDocument(x))
  }

  async createExport(create: ExportCreateAttrs): Promise<Export> {
    const newExport ={
      userId: new mongoose.Types.ObjectId(create.userId),
      exportType: create.format,
      status: ExportStatus.Running,
      relativePath: create.relativePath,
      filename: create.filename,
      options: {
        eventId: create.eventId,
        filter: create.filter,
        projection: create.projection
      },
      expirationDate: new Date(Date.now() + (this.explortTtlMillis))
    }

    const document = await this.model.create(newExport)
    const populated = await this.model.populate(document, [{ path: 'userId' }, { path: 'options.eventId', select: 'name' }])
    return this.entityForDocument(populated)
  }

  async updateExport(exportId: ExportId, attrs: Partial<Export>): Promise<Export | null> {
    const document = await this.model.findByIdAndUpdate(exportId, attrs, { new: true })
    if (!document) {
      return null
    }

    return this.entityForDocument(document)
  }

  async updateExportForUser(exportId: ExportId, userId: UserId, update: Partial<Export>): Promise<Export | null > {
    const document = await this.model.findByIdAndUpdate(exportId, update, { new: true }).where('userId').equals(userId)
    if (!document) {
      return null
    }

    return this.entityForDocument(document)
  }

  async deleteExport(exportId: ExportId): Promise<Export | null> {
    const document = await this.model.findByIdAndDelete(exportId)
    if (!document) {
      return null
    }

    return this.entityForDocument(document)
  }

  async deleteExportForUser(exportId: ExportId, userId: UserId): Promise<Export | null> {
    const document = await this.model.findOneAndDelete({ _id: exportId, userId })
    if (!document) {
      return null
    }

    return this.entityForDocument(document)
  }
}
