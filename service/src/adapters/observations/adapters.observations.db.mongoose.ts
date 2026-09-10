import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import { Attachment, AttachmentId, AttachmentNotFoundError, AttachmentPatchAttrs, copyObservationAttrs, EventScopedObservationRepository, FindObservationsResult, FindObservationsSort, FindObservationsSpec, FindObservationsStreamSpec, FindObservationsWhere, FormEntry, FormEntryId, Observation, ObservationAttrs, ObservationId, ObservationImportantFlag, ObservationRepositoryError, ObservationRepositoryErrorCode, ObservationRepositoryForEvent, ObservationState, patchAttachment, Thumbnail, AttachmentProcessingStatus, ObservationUserExpanded, UsersExpandedObservationAttrs } from '../../entities/observations/entities.observations'
import { BaseMongooseRepository, DocumentMapping, pageQuery } from '../base/adapters.base.db.mongoose'
import mongoose, { FilterQuery } from 'mongoose'
import * as legacy from '../../models/observation'
import { MageEventModelInstance } from '../../models/event'
import { pageOf, PageOf, PagingParameters } from '../../entities/entities.global'
import { MongooseMageEventRepository } from '../events/adapters.events.db.mongoose'
import { EventEmitter } from 'events'
import { asyncIterable } from '../adapters.db.mongoose'

export type ObservationIdDocument = mongoose.Document
export type ObservationIdModel = mongoose.Model<ObservationIdDocument>

export class MongooseObservationRepository extends BaseMongooseRepository<legacy.ObservationDocument, legacy.ObservationModel, ObservationAttrs> implements EventScopedObservationRepository {

  readonly eventScope: MageEventId
  readonly idModel: ObservationIdModel

  constructor(eventDoc: Pick<MageEventModelInstance, 'id' | 'collectionName'>, readonly eventLookup: (eventId: MageEventId) => Promise<MageEvent | null>, readonly domainEvents: EventEmitter) {
    // TODO: do not bind to the default mongoose instance and connection
    super(legacy.observationModel(eventDoc), { docToEntity: createDocumentMapping(eventDoc.id) })
    this.eventScope = eventDoc.id
    this.idModel = legacy.ObservationId
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
    const savedDoc = await beforeDoc!.save()
    const savedAttrs = this.entityForDocument(savedDoc)
    const saved = Observation.evaluate(savedAttrs, observation.mageEvent)
    for (const e of observation.pendingEvents) {
      this.domainEvents.emit(e.type, Object.freeze({ ...e, observation: saved }))
    }
    return saved
  }

  iterate(spec: FindObservationsStreamSpec): AsyncIterable<ObservationAttrs> & { close?: () => void } {
    const filter = buildObservationFilter(spec.where || {})
    const sort = buildObservationSort(spec.orderBy)
    const fields: Record<string, any> = {}
    if (!spec.includeAttachments) {
      fields.attachments = { $slice: 0 }
    }
    const cursor = this.model.find(filter, fields).sort(sort).cursor()
    return asyncIterable(cursor, (doc) => this.entityForDocument(doc), () => { cursor.close() })
  }

  async find<T = ObservationAttrs | UsersExpandedObservationAttrs>(
    spec: FindObservationsSpec,
    mapper?: (attrs: ObservationAttrs | UsersExpandedObservationAttrs) => T
  ): Promise<FindObservationsResult<T>> {
    const filter = buildObservationFilter(spec.where)
    const sort = buildObservationSort(spec.orderBy)
    const query = this.model.find(filter).sort(sort)
    if (spec.populateUserNames) {
      query
        .populate({ path: 'userId', select: 'displayName' })
        .populate({ path: 'important.userId', select: 'displayName' })
    }
    const mapDoc = (doc: mongoose.HydratedDocument<legacy.ObservationDocument>): T => {
      const attrs = this.entityForDocument(doc) as UsersExpandedObservationAttrs
      return mapper ? mapper(attrs) : attrs as T
    }
    if (spec.paging) {
      const counted = await pageQuery(query, spec.paging)
      const docs = await counted.query
      return { type: 'paged', page: pageOf(docs.map(mapDoc), spec.paging, counted.totalCount) }
    }
    const docs = await query.exec()
    return { type: 'all', observations: docs.map(mapDoc) }
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

export const createObservationRepositoryFactory = (eventRepo: MongooseMageEventRepository, domainEvents: EventEmitter): ObservationRepositoryForEvent => {
  return async (eventId: MageEventId): Promise<EventScopedObservationRepository> => {
    const event = await eventRepo.model.findById(eventId)
    if (event) {
      return new MongooseObservationRepository(
        { id: eventId, collectionName: event.collectionName },
        async mageEventId => {
          return await eventRepo.findById(mageEventId)
        },
        domainEvents)
    }
    const err = new Error(`unexpected error: event not found for id ${event}`)
    console.error(err)
    throw err
  }
}

export type PendingAttachmentReference = {
  eventId: MageEventId
  observationId: ObservationId
  attachmentId: AttachmentId
}

function buildObservationFilter(where: FindObservationsWhere): FilterQuery<legacy.ObservationDocument> {
  const query: FilterQuery<legacy.ObservationDocument>[] = []

  if (where.ids) {
    query.push({ _id: { $in: where.ids } })
  }

  if (where.lastModifiedAfter) {
    query.push({ lastModified: { $gte: where.lastModifiedAfter } })
  }

  if (where.lastModifiedBefore) {
    query.push({ lastModified: { $lt: where.lastModifiedBefore } })
  }

  if (where.timestampAfter) {
    query.push({ 'properties.timestamp': { $gte: where.timestampAfter } })
  }

  if (where.timestampBefore) {
    query.push({ 'properties.timestamp': { $lt: where.timestampBefore } })
  }

  if (where.stateIsAnyOf) {
    query.push({ 'states.0.name': { $in: where.stateIsAnyOf } })
  }

  if (Array.isArray(where.geometryIntersects)) {
    const [ west, south, east, north ] = where.geometryIntersects
    query.push({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Polygon',
            coordinates: [[
              [ west, south ],
              [ east, south ],
              [ east, north ],
              [ west, north ],
              [ west, south ]
            ]]
          }
        }
      }
    })
  }

  if (where.isFlaggedImportant) {
    query.push({ important: { $exists: true } })
  }

  if (where.isFavoriteOfUser) {
    query.push({ favoriteUserIds: where.isFavoriteOfUser })
  }

  if (where.hasAttachments) {
    query.push({ 'attachments.0': { $exists: true } })
  }

  if (where.userIsAnyOf !== undefined) {
    query.push({ 'userId': { $in: where.userIsAnyOf } })
  }

  return query.length ? { $and: query } : {}
}

function buildObservationSort(sort?: FindObservationsSort): any {
  const order = typeof sort?.order === 'number' ? sort.order : 1
  const dbSort = {} as any
  if (sort?.field === 'lastModified') {
    dbSort.lastModified = order
  } else if (sort?.field === 'timestamp') {
    dbSort['properties.timestamp'] = order
  }
  // add _id to sort for consistent ordering
  dbSort._id = order || -1

  return dbSort
}

function createDocumentMapping(eventId: MageEventId): DocumentMapping<legacy.ObservationDocument, ObservationAttrs> {
  return doc => {
    const attrs: UsersExpandedObservationAttrs = {
      id: doc.id,
      eventId,
      createdAt: doc.createdAt,
      lastModified: doc.lastModified,
      type: doc.type,
      geometry: doc.geometry,
      bbox: doc.bbox,
      states: doc.states.map(stateAttrsForDoc),
      properties: {
        ...doc.properties,
        forms: doc.properties.forms.map(formEntryForDoc)
      },
      attachments: doc.attachments.map(attachmentAttrsForDoc),
      deviceId: doc.deviceId?.toHexString(),
      important: importantFlagAttrsForDoc(doc),
      favoriteUserIds: doc.favoriteUserIds?.map(x => x.toHexString()),
    }
    const populatedUserId = doc.populated('userId') as mongoose.Types.ObjectId | undefined
    if (populatedUserId) {
      attrs.userId = populatedUserId.toHexString()
      if (doc.userId && typeof doc.userId === 'object' && 'displayName' in doc.userId) {
        attrs.user = { id: attrs.userId, displayName: (doc.userId as any).displayName } as ObservationUserExpanded
      }
    }
    else if (doc.userId) {
      attrs.userId = doc.userId.toHexString()
    }
    return attrs
  }
}

function importantFlagAttrsForDoc(doc: legacy.ObservationDocument): ObservationImportantFlag | undefined {
  /*
  because the observation schema defines `important` as a nested documnet
  instead of a subdocument schema, a mongoose observation document instance
  always returns a value for `observation.important`, even if the `important`
  key is undefined in the database.  so, if `important` is undefined in the
  database, the mongoose document instance `important` getter will return an
  empty object `{}`.  not cool, mongoose.
  */
  const docImportant = doc.important
  if (docImportant?.userId || docImportant?.timestamp || docImportant?.description) {
    const important: ObservationImportantFlag & { user?: ObservationUserExpanded } = {
      timestamp: docImportant.timestamp,
      description: docImportant.description
    }
    const populatedImportantUserId = doc.populated('important.userId') as mongoose.Types.ObjectId | undefined
    if (populatedImportantUserId) {
      important.userId = populatedImportantUserId.toHexString()
      if (docImportant.userId && typeof docImportant.userId === 'object' && 'displayName' in docImportant.userId) {
        important.user = { id: important.userId, displayName: (docImportant.userId as any).displayName }
      }
    }
    else if (docImportant.userId) {
      important.userId = docImportant.userId.toHexString()
    }
    return important
  }
  return undefined
}

function attachmentAttrsForDoc(doc: legacy.AttachmentDocument): Attachment {
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
    processingStatus: doc.processingStatus,
    processingMessage: doc.processingMessage,
    processingHook: doc.processingHook,
    stagedContentId: doc.stagedContentId,
    processingRetryCount: doc.processingRetryCount,
  }
}

function thumbnailAttrsForDoc(doc: legacy.ThumbnailDocument): Thumbnail {
  return {
    // TODO: is id necessary for thumbnails? needs cleanup
    contentLocator: doc.relativePath,
    minDimension: doc.minDimension,
    contentType: doc.contentType,
    height: doc.height,
    width: doc.width,
    size: doc.size,
    name: doc.name,
  }
}

function stateAttrsForDoc(doc: legacy.ObservationStateDocument): ObservationState {
  return {
    id: doc.id,
    name: doc.name,
    userId: doc.userId?.toHexString()
  }
}

function formEntryForDoc(doc: legacy.ObservationDocumentFormEntry): FormEntry {
  const { _id, ...withoutDbId } = doc
  return {
    ...withoutDbId,
    id: _id.toHexString()
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

function attachmentDocSeedForEntity(attrs: Attachment): legacy.AttachmentDocument {
  const seed = assignMongoIdToDocAttrs(attrs)
  seed.relativePath = attrs.contentLocator
  delete seed['contentLocator']
  seed.thumbnails = attrs.thumbnails.map(thumbnailDocSeedForEntity)
  return seed as legacy.AttachmentDocument
}

function thumbnailDocSeedForEntity(attrs: Thumbnail): legacy.ThumbnailDocument {
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

// Define the function to check for pending attachments
export async function findPendingAttachments(limit: number): Promise<PendingAttachmentReference[]> {

  // Set the array of documents
  const eventDocs = await mongoose.connection.collection<{ _id: number, collectionName: string }>('events').find({}).toArray()

  // Loop through each document
  const references: PendingAttachmentReference[] = []
  for (const eventDoc of eventDocs) {
    if (references.length >= limit) {
      break
    }
    const model = legacy.observationModel({ id: eventDoc._id, collectionName: eventDoc.collectionName })

    // mongo aggregation pipeline
    const remaining = limit - references.length
    const pipeline = [
      { $match: { 'attachments.processingStatus': AttachmentProcessingStatus.Pending } },
      { $project: { _id: true, attachments: true } },
      { $unwind: '$attachments' },
      { $match: { 'attachments.processingStatus': AttachmentProcessingStatus.Pending } },
      { $project: { _id: false, observationId: '$_id', attachmentId: '$attachments._id' } },
      { $limit: remaining },
    ]

    // Run the pipeline against the model
    const matches = await model.aggregate(pipeline)

    // loop over the matches
    for (const match of matches) {
      references.push({
        eventId: eventDoc._id,
        observationId: match.observationId.toString(),
        attachmentId: match.attachmentId.toString()
      })
    }
  }
  return references
}
