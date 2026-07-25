import _ from 'lodash'
import mongoose from 'mongoose'
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
        const json = doc.toJSON<Team>()
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
    const { nameOrContactTerm, omitEventTeams } = which || {}
    const searchRegex = new RegExp(_.escapeRegExp(nameOrContactTerm), 'i')

    const termParams = nameOrContactTerm ? {
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    } : {} as any

    const params = omitEventTeams ? {
      $and: [
        termParams,
        {
          teamEventId: null
        }
      ]
    } : termParams

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
