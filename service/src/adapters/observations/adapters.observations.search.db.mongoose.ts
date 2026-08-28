import mongoose, { Connection, Document, FilterQuery, Model, Schema } from 'mongoose'
import { MageEvent, MageEventId } from '../../entities/events/entities.events'
import { Form, FormFieldType } from '../../entities/events/entities.events.forms'
import { Condition, FormEntryId, ObservationAttrs, ObservationFieldFilter, ObservationId, ObservationSearchAttrs, ObservationSearchRepository, SimpleCondition } from '../../entities/observations/entities.observations'
import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import _ from 'lodash'
import moment from 'moment'

export const ObservationSearchModelVersion = 2

export type ObservationSearchDocument = {
  observationId: mongoose.Types.ObjectId
  eventId: MageEventId
  formId: number
  formEntryId: FormEntryId
  text: string
  [key: string]: any
} & Document

export type ObservationSearchModel = Model<ObservationSearchDocument>

export const ObservationSearchModelName = 'ObservationSearch'

export const ObservationSearchSchema = new Schema({
  observationId: { type: Schema.Types.ObjectId, required: true },
  eventId: { type: Number, required: true },
  formId: { type: Number, required: true },
  formEntryId: { type: String, required: true },
  text: { type: String, required: false, default: '' },
}, {
  strict: false,
  versionKey: false
})

// unique per form entry — used by populate to skip already-indexed entries
ObservationSearchSchema.index({ formEntryId: 1 }, { unique: true })
// used by save to delete all entries for an observation before re-inserting
ObservationSearchSchema.index({ observationId: 1 })
// used by condition queries (with index intersection on wildcard for field values)
ObservationSearchSchema.index({ eventId: 1, formId: 1 })
// wildcard covers all dynamic form fields
// MongoDB 6 — separate indexes; query optimizer uses index intersection for condition search.
// When upgrading to MongoDB 7, replace the two above with a single compound wildcard:
// { eventId: 1, formId: 1, '$**': 1 }
ObservationSearchSchema.index({ '$**': 1 })
ObservationSearchSchema.index({ eventId: 1, text: 'text' })

export function ObservationSearchModel(conn: Connection, collection?: string): ObservationSearchModel {
  return conn.model(ObservationSearchModelName, ObservationSearchSchema, collection || 'observationsearch') as any
}

export class MongooseObservationSearchRepository extends BaseMongooseRepository<ObservationSearchDocument, ObservationSearchModel, ObservationSearchAttrs> implements ObservationSearchRepository {

  constructor(model: ObservationSearchModel) {
    super(model)
  }

  async populate(eventId: MageEventId, observations: AsyncIterable<ObservationAttrs>, force: boolean = false): Promise<number> {
    const insertIgnoreDuplicates = async (batch: ObservationSearchAttrs[]): Promise<number> => {
      try {
        const result = await this.model.insertMany(batch, { ordered: false })
        return result.length
      } catch (e: any) {
        // Ignore 11000 duplicate key error — formEntryId already indexed
        if (e.code !== 11000) throw e
        return e.result?.insertedCount ?? 0
      }
    }

    if (force) {
      await this.model.deleteMany({ eventId })
    }

    let count = 0
    const batchSize = 1000
    let batch: ObservationSearchAttrs[] = []
    for await (const observation of observations) {
      batch.push(...searchDocsForObservation(observation))
      if (batch.length >= batchSize) {
        count += await insertIgnoreDuplicates(batch)
        batch = []
      }
    }

    if (batch.length) {
      count += await insertIgnoreDuplicates(batch)
    }

    return count
  }

  async save(observation: ObservationAttrs): Promise<void> {
    const docs = searchDocsForObservation(observation)
    await this.model.deleteMany({ observationId: observation.id })
    if (docs.length) {
      await this.model.insertMany(docs)
    }
  }

  async findIdsByFilter(filter: ObservationFieldFilter, event: MageEvent): Promise<ObservationId[]> {
    if (filter.condition && filter.keyword) {
      const keywordIds = await this.findObjectIdsByKeyword(filter.keyword, event.id)
      if (keywordIds.length === 0) return []
      return this.findIdsByCondition(filter.condition, event, keywordIds)
    }
    if (filter.keyword) {
      return this.findIdsByKeyword(filter.keyword, event.id)
    }
    if (filter.condition) {
      return this.findIdsByCondition(filter.condition, event)
    }
    return []
  }

  private async findIdsByKeyword(keyword: string, eventId: MageEventId): Promise<ObservationId[]> {
    const ids = await this.findObjectIdsByKeyword(keyword, eventId)
    return ids.map(id => id.toHexString())
  }

  private async findIdsByCondition(condition: Condition, event: MageEvent, withinIds?: mongoose.Types.ObjectId[]): Promise<ObservationId[]> {
    const conditions = flattenCondition(condition).map(condition => {
      const form = event.forms.find(f => f.id === condition.formId)
      return { formId: condition.formId, ...asFilterQuery(condition, form) }
    })
    const baseMatch: Record<string, any> = withinIds
      ? { eventId: event.id, observationId: { $in: withinIds }, $or: conditions }
      : { eventId: event.id, $or: conditions }
    const expression = asAggregateExpression(condition, event)
    const results = await this.model.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$observationId', observations: { $push: '$$ROOT' } } },
      { $match: { $expr: expression } },
      { $project: { _id: 1 } }
    ]).exec()
    return results.map((result: { _id: mongoose.Types.ObjectId }) => result._id.toHexString())
  }

  private async findObjectIdsByKeyword(keyword: string, eventId: MageEventId): Promise<mongoose.Types.ObjectId[]> {
    const andSearch = toAndSearch(keyword)
    const phrases = extractPhrases(keyword)
    const match: Record<string, any> = { eventId, $text: { $search: andSearch } }
    if (phrases.length) {
      match.$and = phrases.map(phrase => ({ text: { $regex: `\\b${_.escapeRegExp(phrase)}\\b`, $options: 'i' } }))
    }
    return this.model.distinct('observationId', match)
  }
}

/**
 * Extracts quoted phrases from a keyword query, e.g. `hello "exact usecase"` → `["exact usecase"]`.
 * Used to apply exact regex matching after the text index search to compensate for stemming.
 */
function extractPhrases(keyword: string): string[] {
  const matches = keyword.match(/"([^"]+)"/g) ?? []
  return matches.map(m => m.slice(1, -1))
}

/**
 * Converts a keyword query to a MongoDB $text search string that requires ALL
 * terms to match (AND semantics). Quoted phrases are passed through unchanged
 * so users can search for exact phrases, e.g. `"exact usecase"`.
 */
function toAndSearch(keyword: string): string {
  const tokens = keyword.trim().match(/("(?:[^"]+)"|\S+)/g)
  if (!tokens) {
    return keyword
  }
  return tokens.map(token => token.startsWith('"') ? token : `"${token}"`).join(' ')
}

function searchDocsForObservation(observation: ObservationAttrs): ObservationSearchAttrs[] {
  return observation.properties.forms.map(form => {
    const { id: formEntryId, formId, ...fields } = form
    const text = Object.values(fields).flatMap(value => {
      if (typeof value === 'string') return [value]
      if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
      return []
    }).join(' ')
    return {
      observationId: observation.id,
      eventId: observation.eventId,
      formId,
      formEntryId: String(formEntryId),
      text,
      ...fields,
    }
  })
}

function flattenCondition(condition: Condition): SimpleCondition[] {
  if ('and' in condition) {
    return condition.and.flatMap(flattenCondition)
  }

  if ('or' in condition) {
    return condition.or.flatMap(flattenCondition)
  }

  return [condition]
}

function asAggregateExpression(condition: Condition, event: MageEvent): object {
  if ('and' in condition) {
    return { $and: condition.and.map(c => asAggregateExpression(c, event)) }
  }

  if ('or' in condition) {
    return { $or: condition.or.map(c => asAggregateExpression(c, event)) }
  }

  const form = event.forms.find(f => f.id === condition.formId)
  return {
    $gt: [{
      $size: {
        $filter: {
          input: '$observations',
          cond: {
            $and: [
              { $eq: ['$$this.formId', condition.formId] },
              asFieldAggregateExpression(condition, form),
            ]
          },
        },
      },
    }, 0]
  }
}

function toQueryValue(value: any, form: Form | undefined, fieldName: string): any {
  const formField = form?.fields.find(f => f.name === fieldName)
  if (formField?.type === FormFieldType.DateTime && typeof value === 'string') {
    return parseISO8601(value) ?? value
  }
  return value
}

function asFilterQuery(condition: SimpleCondition, form: Form | undefined): FilterQuery<ObservationSearchDocument> {
  const { field } = condition
  const value = (v: any) => toQueryValue(v, form, field)

  switch (condition.operator) {
    case '=': return { [field]: { $eq: value(condition.value) } }
    case '!=': return { [field]: { $ne: value(condition.value) } }
    case '>': return { [field]: { $gt: value(condition.value) } }
    case '>=': return { [field]: { $gte: value(condition.value) } }
    case '<': return { [field]: { $lt: value(condition.value) } }
    case '<=': return { [field]: { $lte: value(condition.value) } }
    case 'LIKE': return { [field]: { $regex: _.escapeRegExp(String(condition.value)), $options: 'i' } }
    case 'IN': return { [field]: { $in: condition.value } }
    case 'NOT IN': return { [field]: { $nin: condition.value } }
    case 'BETWEEN':
      return { [field]: { $gte: value(condition.value[0]), $lte: value(condition.value[1]) } }
    case 'IS NULL':
      return { [field]: { $in: [null, undefined] } }
    case 'IS NOT NULL':
      return { [field]: { $nin: [null, undefined] } }
  }
}

function asFieldAggregateExpression(
  condition: SimpleCondition,
  form: Form | undefined
): object {
  const formField = form?.fields.find(f => f.name === condition.field)
  const fieldIsArray = formField?.type === FormFieldType.MultiSelectDropdown
  const value = (v: any) => toQueryValue(v, form, condition.field)

  const field = `$$this.${condition.field}`
  switch (condition.operator) {
    case '=':
      if (fieldIsArray) {
        return { $in: [value(condition.value), field] }
      }
      return { $eq: [field, value(condition.value)] }
    case '!=':
      if (fieldIsArray) {
        return { $not: { $in: [value(condition.value), field] } }
      }
      return { $ne: [field, value(condition.value)] }
    case '>': return { $gt: [field, value(condition.value)] }
    case '>=': return { $gte: [field, value(condition.value)] }
    case '<': return { $lt: [field, value(condition.value)] }
    case '<=': return { $lte: [field, value(condition.value)] }
    case 'LIKE': return { $regexMatch: { input: field, regex: _.escapeRegExp(String(condition.value)), options: 'i' } }
    case 'IN': return { $in: [field, condition.value] }
    case 'NOT IN': return { $not: { $in: [field, condition.value] } }
    case 'BETWEEN': return { $and: [{ $gte: [field, value(condition.value[0])] }, { $lte: [field, value(condition.value[1])] }] }
    case 'IS NULL': return { $eq: [{ $ifNull: [field, null] }, null] }
    case 'IS NOT NULL': return { $ne: [{ $ifNull: [field, null] }, null] }
  }
}

function parseISO8601(iso8601: string): Date | undefined {
  const date = moment(iso8601, moment.ISO_8601, true)
  if (typeof iso8601 === 'string' && date.isValid()) {
    return date.toDate()
  }
}
