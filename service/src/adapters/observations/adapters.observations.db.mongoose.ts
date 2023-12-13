import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import { Attachment, AttachmentId, AttachmentNotFoundError, AttachmentPatchAttrs, copyObservationAttrs, EventScopedObservationRepository, FormEntry, FormEntryId, Observation, ObservationAttrs, ObservationId, ObservationImportantFlag, ObservationRepositoryError, ObservationRepositoryErrorCode, ObservationRepositoryForEvent, ObservationState, patchAttachment, Thumbnail } from '../../entities/observations/entities.observations'
import { BaseMongooseRepository, DocumentMapping, pageQuery } from '../base/adapters.base.db.mongoose'
import mongoose from 'mongoose'
import * as legacy from '../../models/observation'
import { MageEventDocument } from '../../models/event'
import { pageOf, PageOf, PagingParameters } from '../../entities/entities.global'
import { MongooseMageEventRepository } from '../events/adapters.events.db.mongoose'
import { EventEmitter } from 'events'

export type ObservationIdDocument = mongoose.Document
export type ObservationIdModel = mongoose.Model<ObservationIdDocument>

export class MongooseObservationRepository extends BaseMongooseRepository<legacy.ObservationDocument, legacy.ObservationModel, ObservationAttrs> implements EventScopedObservationRepository {

  readonly eventScope: MageEventId
  readonly idModel: ObservationIdModel

  constructor(eventDoc: Pick<MageEventDocument, 'id' | 'collectionName'>, readonly eventLookup: (eventId: MageEventId) => Promise<MageEvent | null>, readonly domainEvents: EventEmitter) {
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
      dbId = mongoose.Types.ObjectId(observation.id)
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
      beforeDoc = beforeDoc.set(docSeed) as legacy.ObservationDocument
    }
    else {
      const idVerified = await this.idModel.findById(dbId)
      if (!idVerified) {
        return new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId)
      }
      beforeDoc = new this.model(docSeed)
    }
    const savedDoc = await beforeDoc.save() as legacy.ObservationDocument
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
      { _id: mongoose.Types.ObjectId(observation.id), attachments: { $elemMatch: { _id: mongoose.Types.ObjectId(attachmentId) } } },
      { $set: { 'attachments.$': attachment } },
      { new: true })
    if (doc) {
      return Observation.evaluate(this.entityForDocument(doc), observation.mageEvent)
    }
    return null
  }

  async nextFormEntryIds(count: number = 1): Promise<FormEntryId[]> {
    return Array.from({ length: count }).map(_ => mongoose.Types.ObjectId().toHexString())
  }

  async nextAttachmentIds(count: number = 1): Promise<AttachmentId[]> {
    return Array.from({ length: count }).map(_ => mongoose.Types.ObjectId().toHexString())
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

export function docToEntity(doc: legacy.ObservationDocument, eventId: MageEventId): ObservationAttrs {
  return createDocumentMapping(eventId)(doc)
}

function createDocumentMapping(eventId: MageEventId): DocumentMapping<legacy.ObservationDocument, ObservationAttrs> {
  return doc => {
    const attrs: ObservationAttrs = {
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
      userId: doc.userId?.toHexString(),
      deviceId: doc.deviceId?.toHexString(),
      important: importantFlagAttrsForDoc(doc),
      favoriteUserIds: doc.favoriteUserIds?.map(x => x.toHexString()),
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
    return {
      userId: docImportant.userId?.toHexString(),
      timestamp: docImportant.timestamp,
      description: docImportant.description
    }
  }
  return void(0)
}

function attachmentAttrsForDoc(doc: legacy.AttachmentDocument): Attachment {
  return {
    id: doc.id,
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

function thumbnailAttrsForDoc(doc: legacy.ThumbnailDocument): Thumbnail {
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
    typeof id === 'string' ? mongoose.Types.ObjectId(id)
    : typeof id === 'number' ? id
    : mongoose.Types.ObjectId()
  return withoutId
}

function attachmentDocSeedForEntity(attrs: Attachment): legacy.AttachmentDocAttrs {
  const seed = assignMongoIdToDocAttrs(attrs)
  seed.relativePath = attrs.contentLocator
  delete seed['contentLocator']
  seed.thumbnails = attrs.thumbnails.map(thumbnailDocSeedForEntity)
  return seed as legacy.AttachmentDocAttrs
}

function thumbnailDocSeedForEntity(attrs: Thumbnail): legacy.ThumbnailDocAttrs {
  return {
    _id: mongoose.Types.ObjectId(),
    relativePath: attrs.contentLocator,
    minDimension: attrs.minDimension,
    name: attrs.name,
    contentType: attrs.contentType,
    size: attrs.size,
    width: attrs.width,
    height: attrs.height,
  }
}
