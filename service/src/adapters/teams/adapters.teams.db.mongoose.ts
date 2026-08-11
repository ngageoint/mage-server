import _ from 'lodash'
import mongoose, { RootFilterQuery } from 'mongoose'
import { PageOf, pageOf } from '../../entities/entities.global'
import { Team, TeamFindParameters, TeamId, TeamRepository } from '../../entities/teams/entities.teams'
import * as legacy from '../../models/team'
import { BaseMongooseRepository, pageQuery } from '../base/adapters.base.db.mongoose'

export const TeamModelName = 'Team'

export type TeamDocument = legacy.TeamDocument
export type TeamModel = mongoose.Model<TeamDocument>
export const TeamSchema = legacy.Model.schema

const idString = (x: { _id: mongoose.Types.ObjectId } | mongoose.Types.ObjectId): string => {
  const id: mongoose.Types.ObjectId = x instanceof mongoose.Types.ObjectId ? x : x._id
  return id.toHexString()
}

export class MongooseTeamRepository extends BaseMongooseRepository<TeamDocument, TeamModel, Team> implements TeamRepository {

  constructor(model: mongoose.Model<TeamDocument>) {
    super(model, {
      docToEntity: doc => {
        const json = doc.toObject<Team>({ versionKey: false })
        return {
          ...json,
          id: doc._id.toHexString(),
          userIds: doc.userIds.map(id => idString(id))
        }
      }
    })
  }

  async create(): Promise<Team> {
    throw new Error('method not allowed')
  }

  async update(attrs: Partial<Team> & { id: TeamId }): Promise<Team | null> {
    throw new Error('method not allowed')
  }

  async removeById(id: TeamId): Promise<Team | null> {
    throw new Error('method not allowed')
  }

  async find<T = Team>(which: TeamFindParameters, mapping?: (x: Team) => T): Promise<PageOf<T>> {
    const { searchTerm, omitEventTeams } = which || {}
    const searchRegex = new RegExp(_.escapeRegExp(searchTerm), 'i')

    const termParams: RootFilterQuery<TeamDocument> = searchTerm ? {
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    } : {}

    const params = omitEventTeams ? {
      $and: [
        termParams,
        { teamEventId: null }
      ]
    } : termParams

    const toObjectIds = (ids: string[]): mongoose.Types.ObjectId[] => {
      return ids
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
    }

    /*
      TODO: make the type of the parameters enforce this mutual exclusion,
      or just allow both parameters in the query.
     */
    if (which.withMembers) {
      params.userIds = { $in: toObjectIds(which.withMembers) }
    } else if (which.withoutMembers) {
      params.userIds = { $nin: toObjectIds(which.withoutMembers) }
    }

    const baseQuery = this.model.find(params).sort('name _id')
    const counted = await pageQuery(baseQuery, which)
    const teams: T[] = []
    if (!mapping) {
      mapping = (x: Team): T => (x as any as T)
    }

    for await (const teamDoc of counted.query.cursor()) {
      teams.push(mapping(this.entityForDocument(teamDoc)))
    }
    return pageOf(teams, which, counted.totalCount);
  }
}
