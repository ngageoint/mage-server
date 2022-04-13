import { MageEventId } from '../entities/events/entities.events'
import { EventScopedObservationRepository, FormEntryId, Observation, ObservationRepositoryForEvent } from '../entities/observations/entities.observations'
import { BaseMongooseRepository } from './base/adapters.base.db.mongoose'
import mongoose from 'mongoose'
import * as legacy from '../models/observation'
import { MageEventDocument } from '../models/event'
import { PageOf, PagingParameters } from '../entities/entities.global'

export class MongooseObservationRepository extends BaseMongooseRepository<legacy.ObservationDocument, legacy.ObservationModel, Observation> implements EventScopedObservationRepository {

  readonly eventScope: MageEventId

  constructor(eventDoc: Pick<MageEventDocument, 'id' | 'collectionName'>) {
    super(legacy.observationModel(eventDoc))
    this.eventScope = eventDoc.id
  }

  async save(observation: Observation): Promise<Observation> {

    throw new Error('unimplemented')
  }

  async findLatest(): Promise<Observation | null> {
    const latest = await this.model.findOne({}, { lastModified: true }, { sort: { lastModified: -1 }, limit: 1 })
    return latest ? this.entityForDocument(latest) : null
  }

  async findLastModifiedAfter(timestamp: number, paging: PagingParameters): Promise<PageOf<Observation>> {
    throw new Error('unimplemented')
  }

  async nextFormEntryIds(count: number = 1): Promise<FormEntryId[]> {
    return Array.from({ length: count }).map(_ => mongoose.Types.ObjectId().toHexString())
  }
}

export const createObservationRepositoryFactory = (eventLookup: (id: MageEventId) => Promise<MageEventDocument | null>): ObservationRepositoryForEvent => {
  return async (eventId: MageEventId): Promise<EventScopedObservationRepository> => {
    const event = await eventLookup(eventId)
    if (event) {
      return new MongooseObservationRepository({ id: eventId, collectionName: event.collectionName })
    }
    const err = new Error(`unexpected error: event not found for id ${event}`)
    console.error(err)
    throw err
  }
}