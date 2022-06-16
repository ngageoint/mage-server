import { BaseMongooseRepository } from '../base/adapters.base.db.mongoose'
import { MageEventRepository, MageEventAttrs, MageEventId, MageEvent } from '../../entities/events/entities.events'
import mongoose from 'mongoose'
import { FeedId } from '../../entities/feeds/entities.feeds'
import * as legacy from '../../models/event'
import { Team } from '../../entities/teams/entities.teams'


export const MageEventModelName = 'Event'

export type MageEventDocument = legacy.MageEventDocument
export type MageEventModel = mongoose.Model<legacy.MageEventDocument>
export const MageEventSchema = legacy.Model.schema

export class MongooseMageEventRepository extends BaseMongooseRepository<MageEventDocument, MageEventModel, MageEventAttrs, MageEvent> implements MageEventRepository {

  constructor(model: MageEventModel) {
    super(model)
  }

  async create(): Promise<MageEventAttrs> {
    throw new Error('method not allowed')
  }

  async update(attrs: Partial<MageEventAttrs> & { id: MageEventId }): Promise<MageEventAttrs | null> {
    throw new Error('method not allowed')
  }

  async findById(id: MageEventId): Promise<MageEvent | null> {
    const attrs = await super.findById(id)
    if (attrs) {
      return new MageEvent(attrs)
    }
    return null
  }

  async findActiveEvents(): Promise<MageEventAttrs[]> {
    const docs = await this.model.find({ complete: { $in: [ null, false ] }})
    return docs.map(this.entityForDocument)
  }

  async addFeedsToEvent(event: MageEventId, ...feeds: FeedId[]): Promise<MageEventAttrs | null> {
    const updated = await this.model.findByIdAndUpdate(
      event,
      {
        $addToSet: {
          feedIds: { $each: feeds }
        }
      },
      { new: true })
    return updated ? this.entityForDocument(updated) : null
  }

  async removeFeedsFromEvent(event: MageEventId, ...feeds: FeedId[]): Promise<MageEventAttrs | null> {
    const updated = await this.model.findByIdAndUpdate(
      event,
      {
        $pull: {
          feedIds: { $in: feeds }
        }
      },
      { new: true })
    return updated ? this.entityForDocument(updated) : null
  }

  async removeFeedsFromEvents(...feeds: FeedId[]): Promise<number> {
    const updated = await this.model.updateMany({}, { $pull: { feedIds: { $in: feeds }}})
    return updated.nModified
  }

  /**
   * TODO: this is misplaced; create a team repository
   */
  async findTeamsInEvent(event: MageEventId | MageEventAttrs | MageEventDocument): Promise<Team[] | null> {
    let eventDoc: MageEventDocument | null
    if (!(event instanceof this.model)) {
      const eventId = typeof event === 'object' && 'id' in event ? event.id : event
      eventDoc = await this.model.findById(eventId)
      if (!eventDoc) {
        return null
      }
    }
    else {
      eventDoc = event
    }
    await this.model.populate(eventDoc, { path: 'teamIds' })
    const teamDocs = eventDoc.teamIds as mongoose.Document[]
    return teamDocs.map((x: mongoose.Document) => {
      const team = x.toJSON()
      team.id = team.id.toHexString()
      delete team.__v
      return team
    })
  }
}
