import mongoose from 'mongoose'
import { GetDbConnection } from '@ngageoint/mage.service/lib/plugins.api/plugins.api.db'
import { EventProcessingState, FindUnprocessedImageAttachments, UnprocessedAttachmentReference } from './processor'
import { ObjectId } from 'mongodb'

export function FindUnprocessedAttachments(getDbConn: GetDbConnection, console: Console): FindUnprocessedImageAttachments {
  return async (eventProcessingStates: EventProcessingState[], lastModifiedAfter: number | null, lastModifiedBefore: number | null, limit: number | null): Promise<AsyncIterable<UnprocessedAttachmentReference>> => {
    return {
      [Symbol.asyncIterator]: async function * (): AsyncGenerator<UnprocessedAttachmentReference> {
        limit = Number(limit)
        let remainingCount = limit > 0 ? limit : Number.POSITIVE_INFINITY
        const conn = await getDbConn()
        const eventStateCursor = eventStatesWithCollectionNames(conn, eventProcessingStates, console)
        for await (const eventState of eventStateCursor) {
          const eventId = eventState.event.id
          const queryStages = createAggregationPipeline(eventState, lastModifiedAfter, lastModifiedBefore)
          if (limit) {
            queryStages.push({ $limit: remainingCount })
          }
          console.info(`query unprocessed attachments from event ${eventId} (${eventState.event.name}) newer than ${new Date(eventState.latestAttachmentProcessedTimestamp).toISOString()}`)
          const collection = conn.collection(eventState.collectionName)
          const cursor = await collection.aggregate<UnprocessedAttachmentReferenceDocument>(queryStages)
          for await (const doc of cursor) {
            yield { eventId: eventState.event.id, observationId: doc.observationId.toHexString(), attachmentId: doc.attachmentId.toHexString() }
            if (--remainingCount === 0) {
              console.info(`reached unprocessed attachment limit ${limit}; cancelling query iteration`)
              return await cursor.close().then(_ => eventStateCursor.return!(null)).then(_ => null)
            }
          }
        }
      }
    }
  }
}

type UnprocessedAttachmentReferenceDocument = Record<keyof UnprocessedAttachmentReference, ObjectId>

async function * eventStatesWithCollectionNames(conn: mongoose.Connection, eventStates: Iterable<EventProcessingState>, console: Console): AsyncIterableIterator<EventProcessingState & { collectionName: string }> {
  for (const eventState of eventStates) {
    const found = await conn.collection('events').findOne<{ collectionName: string } | null>({ _id: eventState.event.id })
    if (found) {
      yield { ...eventState, collectionName: found.collectionName }
    }
    else {
      console.warn(`event not found for event processing state:`, eventState)
    }
  }
}

function createAggregationPipeline(eventState: EventProcessingState, lastModifiedAfter: number | null, lastModifiedBefore: number | null): object[] {
  const match: any = { $match: {
    'attachments.oriented': false,
    'attachments.contentType': /^image/,
    $or: [
      { 'states.0.name': { $eq: 'active' }},
      { 'states.0.name': { $exists: false }}
    ]
  }}
  lastModifiedAfter = typeof lastModifiedAfter === 'number' ? lastModifiedAfter : eventState.latestAttachmentProcessedTimestamp
  const lastModified = { $gte: new Date(lastModifiedAfter) } as any
  if (lastModifiedBefore) {
    lastModified.$lte = new Date(lastModifiedBefore)
  }
  match.$match = { lastModified, ...match.$match }
  /*
  TODO: how does mongo driver account for nondeterministic key order in this sort document?
  BSON keys are ordered, but JSON key order in Node/V8 is not guaranteed.
  */
  const sort = { $sort: { lastModified: 1, _id: 1 }}
  const projectFilteredAttachments = {
    $project: {
      observationId: '$_id', _id: false,
      attachments: {
        $filter: { input: '$attachments', as: 'att',
          cond: {
            $and: [
              { $eq: [ '$$att.oriented', false ] },
              { $gt: [ '$$att.relativePath', null ] },
              { $eq: [ { $indexOfBytes: [ '$$att.contentType', 'image/' ] }, 0 ] }
            ]
          }
        }
      }
    }
  }
  const unwindAttachments = { $unwind: '$attachments' }
  const projectAttachmentId = { $project: { observationId: 1, attachmentId: '$attachments._id' }}
  return [ match, sort, projectFilteredAttachments, unwindAttachments, projectAttachmentId ]
}