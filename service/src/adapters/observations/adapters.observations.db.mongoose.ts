import { MageEvent, MageEventAttrs, MageEventId } from '../../entities/events/entities.events'
import { Attachment, AttachmentId, AttachmentNotFoundError, AttachmentPatchAttrs, copyObservationAttrs, EventScopedObservationRepository, UsersExpandedObservationAttrs, FindObservationsSpec, FormEntry, FormEntryId, Observation, ObservationAttrs, ObservationFeatureProperties, ObservationId, ObservationImportantFlag, ObservationRepositoryError, ObservationRepositoryErrorCode, ObservationState, patchAttachment, Thumbnail, UserExpandedObservationImportantFlag } from '../../entities/observations/entities.observations'
import { BaseMongooseRepository, DocumentMapping, pageQuery, WithMongooseDefaultVersionKey } from '../base/adapters.base.db.mongoose'
import mongoose from 'mongoose'
import { MageEventDocument } from '../../models/event'
import { pageOf, PageOf, PagingParameters } from '../../entities/entities.global'
import { EventEmitter } from 'events'

const Schema = mongoose.Schema

export type ObservationIdDocument = { _id: mongoose.Types.ObjectId }
export type ObservationIdModel = mongoose.Model<ObservationIdDocument>
export const ObservationIdModelName: string = 'ObservationId'
export const ObservationIdSchema = new Schema<ObservationIdDocument, ObservationIdModel>()
export function createObservationIdModel(conn: mongoose.Connection): ObservationIdModel {
  return conn.model(ObservationIdModelName, ObservationIdSchema)
}

export type ObservationDocument = Omit<ObservationAttrs, 'id' | 'eventId' | 'userId' | 'deviceId' | 'important' | 'favoriteUserIds' | 'attachments' | 'states' | 'properties'>
  & {
    _id: mongoose.Types.ObjectId
    userId?: mongoose.Types.ObjectId
    deviceId?: mongoose.Types.ObjectId
    important?: ObservationDocumentImportantFlag
    favoriteUserIds: mongoose.Types.ObjectId[]
    states: ObservationStateDocument[]
    attachments: AttachmentDocument[]
    properties: ObservationDocumentFeatureProperties
  }
  & WithMongooseDefaultVersionKey
export type ObservationSubdocuments = {
  states: mongoose.Types.DocumentArray<ObservationStateDocument>
  attachments: mongoose.Types.DocumentArray<AttachmentDocument>
}
export type ObservationModelOverrides = ObservationSubdocuments & {
  toObject(options?: ObservationTransformOptions): ObservationAttrs
  toJSON(options?: ObservationTransformOptions): ObservationDocumentJson
}
export type ObservationSchema = mongoose.Schema<ObservationDocument>
export type ObservationModel = mongoose.Model<ObservationDocument, object, ObservationModelOverrides>
export type ObservationModelInstance = mongoose.HydratedDocument<ObservationDocument, ObservationModelOverrides>
export type ObservationDocumentJson = Omit<ObservationAttrs, 'id' | 'eventId' | 'attachments' | 'states'> & {
  id: mongoose.Types.ObjectId
  eventId?: number
  /**
   * @deprecated TODO: confine URLs to the web layer
   */
  url: string
  attachments: AttachmentDocumentJson[]
  states: ObservationStateDocumentJson[]
}

/**
 * This interface defines the options that one can supply to the `toJSON()`
 * method of the Mongoose Document instances of the Observation model.
 */
export interface ObservationTransformOptions extends mongoose.ToObjectOptions {
  /**
   * The database schema does not include the event ID for observation
   * documents.  Use this option to add the `eventId` property to the
   * observation JSON document.
   */
  event?: MageEventDocument | MageEventAttrs | { id: MageEventId, [others: string]: any }
  /**
   * If the `path` option is present, the JSON transormation will prefix the
   * `url` property of the observation JSON object with the value of `path`.
   * @deprecated TODO: confine URLs to the web layer
   */
  path?: string
}
export type ObservationDocumentFeatureProperties = Omit<ObservationFeatureProperties, 'forms'> & {
  forms: ObservationDocumentFormEntry[]
}

export type ObservationDocumentFormEntry = Omit<FormEntry, 'id'> & {
  _id: mongoose.Types.ObjectId
}
export type ObservationDocumnetFormEntryJson = Omit<FormEntry, 'id'> & {
  id: ObservationDocumentFormEntry['_id']
}

export type AttachmentDocument = Omit<Attachment, 'id' | 'observationFormId' | 'contentLocator' | 'thumbnails'> & {
  _id: mongoose.Types.ObjectId
  observationFormId: mongoose.Types.ObjectId
  relativePath?: string
  thumbnails: ThumbnailDocument[]
}
export type AttachmentDocumentJson = Omit<Attachment, 'id' | 'contentLocator' | 'thumbnails'> & {
  id: AttachmentDocument['_id']
  relativePath?: string
  /**
   * @deprecated TODO: confine URLs to the web layer
   */
  url?: string
}

export type ThumbnailDocument = Omit<Thumbnail, 'id' | 'contentLocator'> & {
  _id: mongoose.Types.ObjectId
  relativePath?: string
}

export type ObservationDocumentImportantFlag = Omit<ObservationImportantFlag, 'userId'> & {
  userId?: mongoose.Types.ObjectId
}

export type ObservationStateDocument = Omit<ObservationState, 'id' | 'userId'> & {
  _id: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
}
export type ObservationStateDocumentJson = Omit<ObservationState, 'id'> & {
  id: string
  // TODO: url should move to web layer
  url: string
}

function hasOwnProperty(wut: any, property: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(wut, property)
}

/**
 * @deprecated TODO: obs types: This exists for backward compatibility, but should be viable to remove when all
 * observation routes that return observation json transition to DI architecture in the adapter layer, as the newer
 * `WebObservation` type mapping handles adding the `url` key to observation documents in the observation
 * [web controller](./adapters.observations.controllers.web.ts).
 */
function transformObservationModelInstance(modelInstance: mongoose.HydratedDocument<ObservationDocument, ObservationSubdocuments> | mongoose.HydratedDocument<ObservationIdDocument>, result: any, options: ObservationTransformOptions): ObservationAttrs {
  result.id = modelInstance._id.toHexString()
  delete result._id
  delete result.__v
  const event = options.event || {} as any
  if (hasOwnProperty(event, '_id')) {
    result.eventId = event?._id
  }
  else if (hasOwnProperty(event, 'id')) {
    result.eventId = event.id
  }
  const path = options.path || ''
  result.url = `${path}/${result.id}`
  if (result.states && result.states.length) {
    const currentState = result.states[0]
    const currentStateId = currentState._id.toHexString()
    result.state = {
      id: currentStateId,
      name: currentState.name,
      userId: currentState.userId?.toHexString(),
      url: `${result.url}/states/${currentStateId}`
    }
    delete result.states
  }
  if (result.properties && result.properties.forms) {
    result.properties.forms = result.properties.forms.map((formEntry: AttachmentDocument) => {
      const mapped: any = formEntry
      mapped.id = formEntry._id.toHexString()
      delete mapped._id
      return mapped
    })
  }
  if (result.attachments) {
    result.attachments = result.attachments.map((doc: AttachmentDocument) => {
      const entity = attachmentAttrsForDoc(doc) as Partial<Attachment>
      delete entity.thumbnails
      entity.url = `${result.url}/attachments/${entity.id}`
      return entity
    })
  }
  const populatedUserId = modelInstance.populated('userId')
  if (populatedUserId) {
    result.user = result.userId
    // TODO Update mobile clients to handle observation.userId or observation.user.id
    // Leave userId as mobile clients depend on it for observation create/update,
    result.userId = populatedUserId
  }
  const populatedImportantUserId = modelInstance.populated('important.userId')
  if (populatedImportantUserId && result.important) {
    result.important.user = result.important.userId
    delete result.important.userId
  }
  return result
}

ObservationIdSchema.set('toJSON', { transform: transformObservationModelInstance })

export const StateSchema = new Schema({
  name: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' }
})

export const ThumbnailSchema = new Schema(
  {
    minDimension: { type: Number, required: true },
    contentType: { type: String, required: false },
    size: { type: Number, required: false },
    name: { type: String, required: false },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    relativePath: { type: String, required: false },
  },
  { strict: false }
)

export const AttachmentSchema = new Schema(
  {
    observationFormId: { type: Schema.Types.ObjectId, required: true },
    fieldName: { type: String, required: true },
    lastModified: { type: Date, required: false },
    contentType: { type: String, required: false },
    size: { type: Number, required: false },
    name: { type: String, required: false },
    relativePath: { type: String, required: false },
    width: { type: Number, required: false },
    height: { type: Number, required: false },
    oriented: { type: Boolean, required: true, default: false },
    thumbnails: [ThumbnailSchema]
  },
  { strict: false }
)

export const ObservationSchema = new Schema(
  {
    type: { type: String, enum: ['Feature'], required: true },
    lastModified: { type: Date, required: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, sparse: true },
    deviceId: { type: Schema.Types.ObjectId, required: false, sparse: true },
    geometry: Schema.Types.Mixed,
    properties: Schema.Types.Mixed,
    attachments: [AttachmentSchema],
    states: [StateSchema],
    important: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      timestamp: { type: Date, required: false },
      description: { type: String, required: false }
    },
    favoriteUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  {
    strict: false,
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'lastModified'
    }
  }
)

ObservationSchema.index({ geometry: '2dsphere' })
ObservationSchema.index({ lastModified: 1 })
ObservationSchema.index({ userId: 1 })
ObservationSchema.index({ deviceId: 1 })
ObservationSchema.index({ 'properties.timestamp': 1 })
ObservationSchema.index({ 'states.name': 1 })
ObservationSchema.index({ 'attachments.lastModified': 1 })
ObservationSchema.index({ 'attachments.oriented': 1 })
ObservationSchema.index({ 'attachments.contentType': 1 })
ObservationSchema.index({ 'attachments.thumbnails.minDimension': 1 })

/**
 * TODO: add support for mongoose `lean()` queries
 */
export class MongooseObservationRepository extends BaseMongooseRepository<ObservationDocument, ObservationModel, ObservationAttrs> implements EventScopedObservationRepository {

  constructor(model: ObservationModel, readonly idModel: ObservationIdModel, readonly eventScope: MageEventId, readonly eventLookup: (eventId: MageEventId) => Promise<MageEvent | null>, readonly domainEvents: EventEmitter) {
    super(model, { docToEntity: createDocumentMapping(eventScope) })
    this.idModel = mongoose.model('ObservationId')
  }

  async allocateObservationId(): Promise<ObservationId> {
    const idDoc = await this.idModel.create({})
    return idDoc.id
  }

  async save(observation: Observation): Promise<Observation | ObservationRepositoryError> {
    if (observation.validation.hasErrors) {
      return new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservation)
    }
    let dbId
    try {
      dbId = new mongoose.Types.ObjectId(observation.id)
    }
    catch (err) {
      return new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId)
    }
    const attrs = copyObservationAttrs(observation)
    const docSeed = { ...attrs, _id: dbId } as any
    delete docSeed.importantFlag
    if (attrs.important) {
      docSeed.important = attrs.important
    }
    docSeed.properties.forms = attrs.properties.forms.map(assignMongoIdToDocAttrs)
    docSeed.attachments = attrs.attachments.map(attachmentDocSeedForEntity)
    docSeed.states = attrs.states.map(assignMongoIdToDocAttrs)
    let beforeDoc = await this.model.findById(dbId)
    if (beforeDoc) {
      if (docSeed.createdAt.getTime() !== beforeDoc.createdAt.getTime()) {
        console.warn(`attempted to modify create timestamp on observation ${beforeDoc.id} from ${beforeDoc.createdAt} to ${docSeed.createdAt}`)
        docSeed.createdAt = new Date(beforeDoc.createdAt)
      }
      beforeDoc = beforeDoc.set(docSeed)
    }
    else {
      const idVerified = await this.idModel.findById(dbId)
      if (!idVerified) {
        return new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId)
      }
      beforeDoc = new this.model(docSeed)
    }
    const savedDoc = await beforeDoc!.save() as ObservationDocument
    const savedAttrs = this.entityForDocument(savedDoc)
    const saved = Observation.evaluate(savedAttrs, observation.mageEvent)
    for (const e of observation.pendingEvents) {
      this.domainEvents.emit(e.type, Object.freeze({ ...e, observation: saved }))
    }
    return saved
  }

  async findById(id: ObservationId): Promise<Observation | null> {
    const attrs = await super.findById(id)
    if (!attrs) {
      return null
    }
    const mageEvent = await this.eventLookup(attrs.eventId)
    if (!mageEvent) {
      return null
    }
    return Observation.evaluate(attrs, mageEvent)
  }

  async findLatest(): Promise<ObservationAttrs | null> {
    const latest = await this.model.findOne({}, { lastModified: true }, { sort: { lastModified: -1 }, limit: 1 })
    return latest ? this.entityForDocument(latest) : null
  }

  async findSome<
    FindSpec extends FindObservationsSpec = FindObservationsSpec,
    T = FindSpec extends { populateUserNames: true } ? UsersExpandedObservationAttrs : ObservationAttrs
  >(findSpec: FindSpec, mapping?: (x: ObservationAttrs | UsersExpandedObservationAttrs) => T): Promise<PageOf<T>> {
    const { where, orderBy, paging: specPaging } = findSpec
    const dbFilter = {} as any
    if (where.lastModifiedAfter) {
      dbFilter.lastModified = { $gte: where.lastModifiedAfter }
    }
    if (where.lastModifiedBefore) {
      dbFilter.lastModified = { ...dbFilter.lastModified, $lt: where.lastModifiedBefore }
    }
    if (where.timestampAfter) {
      dbFilter['properties.timestamp'] = { $gte: where.timestampAfter }
    }
    if (where.timestampBefore) {
      dbFilter['properties.timestamp'] = { ...dbFilter['properties.timestamp'], $lt: where.timestampBefore }
    }
    if (where.stateIsAnyOf) {
      dbFilter['states.0.name'] = { $in: where.stateIsAnyOf }
    }
    if (Array.isArray(where.geometryIntersects)) {
      dbFilter.$geoIntersects = { $geometry: where.geometryIntersects }
    }
    if (typeof where.isFlaggedImportant === 'boolean') {
      dbFilter.important = { $exists: where.isFlaggedImportant }
    }
    if (where.isFavoriteOfUser) {
      dbFilter.favoriteUserIds = where.isFavoriteOfUser
    }
    const dbSort = {} as any
    const order = typeof orderBy?.order === 'number' ? orderBy.order : 1
    if (orderBy?.field === 'lastModified') {
      dbSort.lastModified = order
    }
    else if (orderBy?.field === 'timestamp') {
      dbSort['properties.timestamp'] = order
    }
    // add _id to sort for consistent ordering
    dbSort._id = orderBy?.order || -1
    const populatedUserNullSafetyTransform = (user: object | null, _id: mongoose.Types.ObjectId): object => user ? user : { _id }
    const options: mongoose.QueryOptions<ObservationDocument> = dbSort ? { sort: dbSort } : {}
    const paging: PagingParameters = specPaging || { includeTotalCount: false, pageSize: Number.MAX_SAFE_INTEGER, pageIndex: 0 }
    const counted = await pageQuery(
      this.model.find(dbFilter, null, options)
        .lean(true)
        .populate([
          // TODO: something smarter than a mongoose join would be good here
          // maybe just store the display name on the observation document
          { path: 'userId', select: 'displayName', transform: populatedUserNullSafetyTransform },
          { path: 'important.userId', select: 'displayName', transform: populatedUserNullSafetyTransform }
        ]),
      paging
    )
    const mapResult = typeof mapping === 'function' ? mapping : ((x: any): T => x as T)
    const items = await counted.query
    const mappedItems = items.map(doc => mapResult(this.entityForDocument(doc)))
    return pageOf(mappedItems, paging, counted.totalCount)
  }

  async findLastModifiedAfter(timestamp: number, paging: PagingParameters): Promise<PageOf<ObservationAttrs>> {
    const match = { lastModified: {$gte: new Date(timestamp)} }
    const counted = await pageQuery(this.model.find(match), paging)
    const observations: ObservationAttrs[] = []
    for await (const doc of counted.query.cursor()) {
      observations.push(this.entityForDocument(doc))
    }
    return pageOf(observations, paging, counted.totalCount)
  }

  async patchAttachment(observation: Observation, attachmentId: AttachmentId, patch: AttachmentPatchAttrs): Promise<Observation | AttachmentNotFoundError | null> {
    const patchedObs = patchAttachment(observation, attachmentId, patch)
    if (!(patchedObs instanceof Observation)) {
      return patchedObs
    }
    const attachment = attachmentDocSeedForEntity(patchedObs.attachmentFor(attachmentId) as Attachment)
    const doc = await this.model.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(observation.id), attachments: { $elemMatch: { _id: new mongoose.Types.ObjectId(attachmentId) } } },
      { $set: { 'attachments.$': attachment } },
      { new: true, setDefaultsOnInsert: false })
    if (doc) {
      return Observation.evaluate(this.entityForDocument(doc), observation.mageEvent)
    }
    return null
  }

  async nextFormEntryIds(count: number = 1): Promise<FormEntryId[]> {
    return Array.from({ length: count }).map(() => (new mongoose.Types.ObjectId()).toHexString())
  }

  async nextAttachmentIds(count: number = 1): Promise<AttachmentId[]> {
    return Array.from({ length: count }).map(() => (new mongoose.Types.ObjectId()).toHexString())
  }
}

type PopulatedUserDocument = { _id: mongoose.Types.ObjectId, displayName: string }
type ObservationDocumentPopulated = Omit<ObservationDocument, 'userId' | 'important'> & {
  userId: PopulatedUserDocument
  important: Omit<ObservationDocumentImportantFlag, 'userId'> & { userId: PopulatedUserDocument }
}

function createDocumentMapping(eventId: MageEventId): DocumentMapping<ObservationDocument | ObservationDocumentPopulated, ObservationAttrs> {
  return doc => {
    const attrs: UsersExpandedObservationAttrs = {
      id: doc._id.toHexString(),
      eventId,
      createdAt: doc.createdAt,
      lastModified: doc.lastModified,
      type: doc.type,
      geometry: doc.geometry,
      bbox: doc.bbox as GeoJSON.BBox,
      states: doc.states.map(stateAttrsForDoc),
      properties: {
        ...doc.properties,
        forms: doc.properties.forms.map(formEntryForDoc)
      },
      important: importantFlagAttrsForDoc(doc) as any,
      attachments: doc.attachments.map(attachmentAttrsForDoc),
      deviceId: doc.deviceId?.toHexString(),
      favoriteUserIds: doc.favoriteUserIds?.map(x => x.toHexString()),
    }
    if (doc.userId instanceof mongoose.Types.ObjectId) {
      attrs.userId = doc.userId.toHexString()
    }
    else if (doc.userId?._id) {
      attrs.userId = doc.userId._id.toHexString()
      attrs.user = {
        id: attrs.userId,
        displayName: doc.userId.displayName
      }
    }
    return attrs
  }
}

function importantFlagAttrsForDoc(doc: ObservationDocument | ObservationDocumentPopulated | mongoose.LeanDocument<ObservationDocument | ObservationDocumentPopulated>): ObservationImportantFlag | UserExpandedObservationImportantFlag | undefined {
  /*
  because the observation schema defines `important` as a nested document
  instead of a subdocument schema, a mongoose observation document instance
  always returns a value for `observation.important`, even if the `important`
  key is undefined in the database.  so, if `important` is undefined in the
  database, the mongoose document instance `important` getter will return an
  empty object `{}`.  not cool, mongoose.
  */
  const docImportant = doc.important
  if (docImportant?.userId || docImportant?.timestamp || docImportant?.description) {
    const important: UserExpandedObservationImportantFlag = {
      timestamp: docImportant.timestamp,
      description: docImportant.description
    }
    if (docImportant.userId instanceof mongoose.Types.ObjectId) {
      important.userId = docImportant.userId.toHexString()
    }
    else if (docImportant.userId?._id instanceof mongoose.Types.ObjectId) {
      important.userId = docImportant.userId._id.toHexString()
      important.user = {
        id: docImportant.userId._id.toHexString(),
        displayName: docImportant.userId.displayName
      }
    }
    return important
  }
  return void(0)
}

function attachmentAttrsForDoc(doc: AttachmentDocument): Attachment {
  return {
    id: doc._id.toHexString(),
    observationFormId: doc.observationFormId.toHexString(),
    fieldName: doc.fieldName,
    lastModified: doc.lastModified ? new Date(doc.lastModified) : undefined,
    name: doc.name,
    contentType: doc.contentType,
    width: doc.width,
    height: doc.height,
    size: doc.size,
    oriented: doc.oriented,
    contentLocator: doc.relativePath,
    thumbnails: doc.thumbnails.map(thumbnailAttrsForDoc),
  }
}

function thumbnailAttrsForDoc(doc: ThumbnailDocument): Thumbnail {
  return {
    // TODO: is id necessary for thumnails? needs cleanup
    contentLocator: doc.relativePath,
    minDimension: doc.minDimension,
    contentType: doc.contentType,
    height: doc.height,
    width: doc.width,
    size: doc.size,
    name: doc.name,
  }
}

function stateAttrsForDoc(doc: ObservationStateDocument): ObservationState {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    userId: doc.userId?.toHexString()
  }
}

function formEntryForDoc(doc: ObservationDocumentFormEntry): FormEntry {
  const { _id, ...withoutDbId } = doc
  return {
    ...withoutDbId as any,
    id: _id.toHexString(),
  }
}

function assignMongoIdToDocAttrs(attrs: { id?: any, [other: string]: any }): { _id: number | mongoose.Types.ObjectId, [other: string]: any } {
  const { id, ...withoutId } = attrs as any
  withoutId._id =
    typeof id === 'string' ? new mongoose.Types.ObjectId(id)
      : typeof id === 'number' ? id
        : new mongoose.Types.ObjectId()
  return withoutId
}

function attachmentDocSeedForEntity(attrs: Attachment): AttachmentDocument {
  const seed = assignMongoIdToDocAttrs(attrs)
  seed.relativePath = attrs.contentLocator
  delete seed['contentLocator']
  seed.thumbnails = attrs.thumbnails.map(thumbnailDocSeedForEntity)
  return seed as AttachmentDocument
}

function thumbnailDocSeedForEntity(attrs: Thumbnail): ThumbnailDocument {
  return {
    _id: new mongoose.Types.ObjectId(),
    relativePath: attrs.contentLocator,
    minDimension: attrs.minDimension,
    name: attrs.name,
    contentType: attrs.contentType,
    size: attrs.size,
    width: attrs.width,
    height: attrs.height,
  }
}
