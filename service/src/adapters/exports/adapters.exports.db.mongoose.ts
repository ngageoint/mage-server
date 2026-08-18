import {
  Export,
  ExportCreateAttrs,
  ExportId,
  ExportStatus,
  ExportsRepository,
  ExportExpanded, ExportOptions, ExportSummary
} from '../../entities/exports/entities.exports'
import mongoose, { HydratedDocument, Model, Schema } from 'mongoose'
import { UserId } from '../../entities/users/entities.users'
import { MageEventDocument } from '../events/adapters.events.db.mongoose'
import { UserDocument } from '../users/adapters.users.db.mongoose'


export type ExportDocument = Omit<Export, 'id' | 'userId'> & {
  _id: mongoose.Types.ObjectId,
  relativePath: string,
  filename: string,
  userId: mongoose.Types.ObjectId,
}

const ErrorSchema = new Schema({
  type: { type: String, required: false },
  message: { type: String, required: true }
}, {
  versionKey: false,
  _id: false,
  timestamps: true
})

const exportSchemaOptions = {
  versionKey: false,
  timestamps: {
    updatedAt: 'lastUpdated'
  },
  toObject: {
    versionKey: false,
    flattenObjectIds: true,
    getters: true,
  },
  toJSON: {
    versionKey: false,
    flattenObjectIds: true,
    getters: true,
  }
} satisfies mongoose.SchemaOptions

const exportExpandedPopulateOptions = [
  { path: 'userId', select: [ '_id', 'username', 'displayName' ] },
  { path: 'options.eventId', select: [ '_id', 'name' ] },
] as const satisfies mongoose.PopulateOptions[]

export const ExportSchema = new mongoose.Schema<ExportDocument>({
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
}, exportSchemaOptions)

export type ExportModelInstance = HydratedDocument<ExportDocument, object, object, object, typeof exportSchemaOptions>
export type ExportModel = Model<ExportDocument, object, object, object, ExportModelInstance, typeof exportSchemaOptions>
export const ExportModelName = 'Export'

export function ExportModel(conn: mongoose.Connection, collection?: string): ExportModel {
  return conn.model(ExportModelName, ExportSchema, collection || 'exports')
}

type PopulatedUser = Pick<UserDocument, '_id' | 'username' | 'displayName'>
type PopulatedMageEvent = Pick<MageEventDocument, '_id' | 'name'>
type ExportPopulatedDocument = Omit<ExportDocument, 'userId' | 'options'> & {
  userId: PopulatedUser,
  options: Omit<ExportOptions, 'eventId'> & {
    eventId: PopulatedMageEvent
  }
}
type ExportPopulatedModelInstanceVirtuals = {
  readonly id: string,
  userId: PopulatedUser & { readonly id: string }
  options: {
    eventId: PopulatedMageEvent & { readonly id: number }
  }
}
type ExportPopulatedModelInstance = HydratedDocument<
  ExportPopulatedDocument,
  object,
  object,
  ExportPopulatedModelInstanceVirtuals,
  typeof exportSchemaOptions
>

function entityForDocument<M extends ExportModelInstance | ExportPopulatedModelInstance>(doc: M): Export {
  return doc.toJSON({ virtuals: true})
}

function expandedEntityForDocument(doc: ExportPopulatedModelInstance): ExportExpanded {
  const { userId: docUser, options: { eventId: docEventId, ...docOptionsRemaining }, ...docRemaining } = doc.toJSON({ virtuals: true })
  doc.populated('userId')
  return {
    ...docRemaining,
    userId: docUser.id,
    user: docUser,
    options: {
      ...docOptionsRemaining,
      eventId: docEventId.id,
      event: docEventId
    }
  }
}

export class MongooseExportsRepository implements ExportsRepository {

  readonly #model: ExportModel
  readonly #exportTtlMillis: number

  constructor(
    model: ExportModel,
    exportTtlMillis: number
  ) {
    this.#model = model
    this.#exportTtlMillis = exportTtlMillis
  }

  async getExports(): Promise<Export[]> {
    const documents = await this.#model.find().sort({ _id: -1 })
    return documents.map(x => entityForDocument(x))
  }

  async getExportForUser(exportId: ExportId, userId: UserId): Promise<ExportExpanded | null> {
    const document = await this.#model.findOne({ _id: exportId, userId })
      .populate<ExportPopulatedModelInstance>(exportExpandedPopulateOptions)

    if (!document) {
      return null
    }

    return expandedEntityForDocument(document)
  }

  async getExportsForUser(userId: string): Promise<ExportExpanded[]> {
    const documents = await this.#model
      .find({ userId })
      .sort({ _id: 'descending' })
      .populate<ExportPopulatedModelInstance>(exportExpandedPopulateOptions)
    return documents.map(expandedEntityForDocument)
  }

  async createExport(create: ExportCreateAttrs): Promise<ExportExpanded> {
    const newExport = {
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
      expirationDate: new Date(Date.now() + (this.#exportTtlMillis))
    }

    const document = await this.#model.create(newExport)
    const populated = await this.#model.populate<ExportPopulatedModelInstance>(document, exportExpandedPopulateOptions)
    return expandedEntityForDocument(populated)
  }

  async updateExport(exportId: ExportId, attrs: Partial<Export>): Promise<Export | null> {
    const document = await this.#model.findByIdAndUpdate(exportId, attrs, { new: true })
    if (!document) {
      return null
    }

    return entityForDocument(document)
  }

  async updateExportForUser(exportId: ExportId, userId: UserId, update: Partial<Export>): Promise<ExportExpanded | null > {
    const document = await this.#model
      .findOneAndUpdate({ _id: exportId, userId: userId }, update, { new: true })
      .populate<ExportPopulatedModelInstance>(exportExpandedPopulateOptions)
    if (!document) {
      return null
    }

    return expandedEntityForDocument(document)
  }

  async deleteExport(exportId: ExportId): Promise<Export | null> {
    const document = await this.#model.findByIdAndDelete(exportId)
    if (!document) {
      return null
    }

    return entityForDocument(document)
  }

  async deleteExportForUser(exportId: ExportId, userId: UserId): Promise<Export | null> {
    const document = await this.#model.findOneAndDelete({ _id: exportId, userId })
    if (!document) {
      return null
    }

    return entityForDocument(document)
  }
}
