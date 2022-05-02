import { MageEvent, MageEventId, MageEventRepository } from '../../entities/events/entities.events'
import { Attachment, AttachmentId, copyObservationAttrs, EventScopedObservationRepository, FormEntry, FormEntryId, Observation, ObservationAttrs, ObservationId, ObservationImportantFlag, ObservationRepositoryError, ObservationRepositoryErrorCode, ObservationRepositoryForEvent, ObservationState } from '../../entities/observations/entities.observations'
import { BaseMongooseRepository, DocumentMapping } from '../base/adapters.base.db.mongoose'
import mongoose from 'mongoose'
import * as legacy from '../../models/observation'
import { MageEventDocument } from '../../models/event'
import { PageOf, PagingParameters, PendingEntityId } from '../../entities/entities.global'
import { MongooseMageEventRepository } from '../events/adapters.events.db.mongoose'
import { AttachmentDocument, ObservationStateDocument } from '../../models/observation'

export type ObservationIdDocument = mongoose.Document
export type ObservationIdModel = mongoose.Model<ObservationIdDocument>

export class MongooseObservationRepository extends BaseMongooseRepository<legacy.ObservationDocument, legacy.ObservationModel, ObservationAttrs> implements EventScopedObservationRepository {

  readonly eventScope: MageEventId
  readonly idModel: ObservationIdModel

  constructor(eventDoc: Pick<MageEventDocument, 'id' | 'collectionName'>, readonly eventLookup: (eventId: MageEventId) => Promise<MageEvent | null>) {
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
    const beforeDoc = await this.model.findById(dbId)
    if (!beforeDoc) {
      const idVerified = await this.idModel.findById(dbId)
      if (!idVerified) {
        return new ObservationRepositoryError(ObservationRepositoryErrorCode.InvalidObservationId)
      }
    }
    const attrs = copyObservationAttrs(observation)
    const docStub = { ...attrs, _id: dbId } as any
    delete docStub.importantFlag
    if (attrs.importantFlag) {
      docStub.important = attrs.importantFlag
    }
    docStub.properties.forms = attrs.properties.forms.map(assignMongoIdToStub)
    docStub.attachments = attrs.attachments.map(assignMongoIdToStub)
    docStub.states = attrs.states.map(assignMongoIdToStub)
    const beforeSaveDoc = new this.model(docStub)
    const afterSaveDoc = await beforeSaveDoc.save() as legacy.ObservationDocument
    const savedAttrs = this.entityForDocument(afterSaveDoc)
    const saved = Observation.evaluate(savedAttrs, observation.mageEvent)
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

  async findLastModifiedAfter(timestamp: number, paging: PagingParameters): Promise<PageOf<Observation>> {
    throw new Error('unimplemented')
  }

  async nextFormEntryIds(count: number = 1): Promise<FormEntryId[]> {
    return Array.from({ length: count }).map(_ => mongoose.Types.ObjectId().toHexString())
  }

  async nextAttachmentIds(count: number = 1): Promise<AttachmentId[]> {
    return Array.from({ length: count }).map(_ => mongoose.Types.ObjectId().toHexString())
  }
}

export const createObservationRepositoryFactory = (eventRepo: MongooseMageEventRepository): ObservationRepositoryForEvent => {
  return async (eventId: MageEventId): Promise<EventScopedObservationRepository> => {
    const event = await eventRepo.model.findById(eventId)
    if (event) {
      return new MongooseObservationRepository(
        { id: eventId, collectionName: event.collectionName },
        async mageEventId => {
          return await eventRepo.findById(mageEventId)
        })
    }
    const err = new Error(`unexpected error: event not found for id ${event}`)
    console.error(err)
    throw err
  }
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
      importantFlag: importantFlagAttrsForDoc(doc),
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

function attachmentAttrsForDoc(doc: AttachmentDocument): Attachment {
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
    thumbnails: doc.thumbnails.slice(),
  }
}

function stateAttrsForDoc(doc: ObservationStateDocument): ObservationState {
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

type EntityDocumentStub = {
  id: string | number | PendingEntityId | undefined
  [attr: string]: any
}
type DocumentStub = {
  _id: mongoose.Types.ObjectId | number
}

function assignMongoIdToStub(attrs: EntityDocumentStub): DocumentStub {
  const { id, ...stub } = attrs
  stub._id =
    typeof id === 'string' ? mongoose.Types.ObjectId(id)
    : typeof id === 'number' ? id
    : mongoose.Types.ObjectId()
  return stub as DocumentStub
}
