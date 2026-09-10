import { describe, it } from 'mocha'
import { expect } from 'chai'
import mongoose from 'mongoose'
import * as legacy from '../../../lib/models/team'
import { TeamModel, MongooseTeamRepository } from '../../../lib/adapters/teams/adapters.teams.db.mongoose'
import { TeamFindParameters } from '../../../lib/entities/teams/entities.teams'

describe('event mongoose repository', function() {

  let mockUser1Id = new mongoose.Types.ObjectId()
  let mockUser2Id = new mongoose.Types.ObjectId()
  let mockUser3Id = new mongoose.Types.ObjectId()
  let mockUser4Id = new mongoose.Types.ObjectId()

  let model: TeamModel
  let repository: MongooseTeamRepository
  let mockTeams = [{
    _id: new mongoose.Types.ObjectId(),
    name: 'Team 1',
    description: 'Group one',
    userIds: [mockUser1Id]
  },{
    _id: new mongoose.Types.ObjectId(),
    name: 'Team 2',
    description: 'Group two',
    userIds: [mockUser1Id, mockUser2Id]
  },{
    _id: new mongoose.Types.ObjectId(),
    name: 'Team 3',
    teamEventId: 3,
    description: 'Users one',
    userIds: [mockUser3Id]
  },{
    _id: new mongoose.Types.ObjectId(),
    name: 'Team 4',
    teamEventId: 4,
    description: 'Users two',
    userIds: [mockUser3Id, mockUser4Id]
  }]

  beforeEach('initialize model', async function() {
    model = legacy.Model as any
    repository = new MongooseTeamRepository(model)

    await model.insertMany(mockTeams)
  })

  afterEach(async function() {
    await model.deleteMany({})
  })

  describe('finding teams by id', function() {

    it('finds team by id', async function() {
      const fetched = await repository.findById(mockTeams[0]._id?.toHexString())
      expect(fetched).to.deep.include({
        id: mockTeams[0]._id?.toHexString(),
        name: mockTeams[0].name,
        userIds: mockTeams[0].userIds.map(id => id.toHexString())
      })
    })

    it('Return null when no team exists by id', async function() {
      const fetched = await repository.findById(new mongoose.Types.ObjectId(),)
      expect(fetched).to.be.null
    })

    it('finds teams by ids', async function() {
      const fetched = await repository.findAllByIds<string>([
        mockTeams[2]._id!.toHexString(),
        mockTeams[3]._id!.toHexString()
      ])
      expect(fetched).to.be.an('object');
      expect(fetched[mockTeams[2]._id!.toHexString()]).to.deep.include({
        id: mockTeams[2]._id?.toHexString(),
        name: mockTeams[2].name,
        userIds: mockTeams[2].userIds.map(id => id.toHexString())
      })

      expect(fetched[mockTeams[3]._id!.toHexString()]).to.deep.include({
        id: mockTeams[3]._id?.toHexString(),
        name: mockTeams[3].name,
        userIds: mockTeams[3].userIds.map(id => id.toHexString())
      })
    })

    it('find all teams for page 1', async function() {
      const parameters: TeamFindParameters = {
        pageSize: 2,
        pageIndex: 0
      }
      const fetched = await repository.find(parameters)
      expect(fetched.totalCount).to.equal(4)
      expect(fetched.pageIndex).to.equal(0)
      expect(fetched.pageSize).to.equal(2)
      expect(fetched.items[0]).to.deep.include({
        id: mockTeams[0]._id?.toHexString(),
        name: mockTeams[0].name,
        userIds: mockTeams[0].userIds.map(id => id.toHexString())
      })
      expect(fetched.items[1]).to.deep.include({
        id: mockTeams[1]._id?.toHexString(),
        name: mockTeams[1].name,
        userIds: mockTeams[1].userIds.map(id => id.toHexString())
      })
    })

    it('find all teams for page 1 with search term', async function() {
      const parameters: TeamFindParameters = {
        pageSize: 2,
        pageIndex: 0,
        searchTerm: 'two'
      }
      const fetched = await repository.find(parameters)
      expect(fetched.totalCount).to.equal(2)
      expect(fetched.pageIndex).to.equal(0)
      expect(fetched.pageSize).to.equal(2)
      expect(fetched.items[0]).to.deep.include({
        id: mockTeams[1]._id?.toHexString(),
        name: mockTeams[1].name,
        userIds: mockTeams[1].userIds.map(id => id.toHexString())
      })
      expect(fetched.items[1]).to.deep.include({
        id: mockTeams[3]._id?.toHexString(),
        name: mockTeams[3].name,
        userIds: mockTeams[3].userIds.map(id => id.toHexString())
      })
    })

    it('find all teams for page 1 and omit event teams', async function() {
      const parameters: TeamFindParameters = {
        pageSize: 4,
        pageIndex: 0,
        omitEventTeams: true
      }
      const fetched = await repository.find(parameters)
      expect(fetched.totalCount).to.equal(2)
      expect(fetched.pageIndex).to.equal(0)
      expect(fetched.pageSize).to.equal(4)
      expect(fetched.items[0]).to.deep.include({
        id: mockTeams[0]._id?.toHexString(),
        name: mockTeams[0].name,
        userIds: mockTeams[0].userIds.map(id => id.toHexString())
      })
      expect(fetched.items[1]).to.deep.include({
        id: mockTeams[1]._id?.toHexString(),
        name: mockTeams[1].name,
        userIds: mockTeams[1].userIds.map(id => id.toHexString())
      })
    })


    it('find all teams for page 1 with members', async function() {
      const parameters: TeamFindParameters = {
        pageSize: 4,
        pageIndex: 0,
        withMembers: [mockUser1Id.toHexString()]
      }
      const fetched = await repository.find(parameters)
      expect(fetched.totalCount).to.equal(2)
      expect(fetched.pageIndex).to.equal(0)
      expect(fetched.pageSize).to.equal(4)
      expect(fetched.items[0]).to.deep.include({
        id: mockTeams[0]._id?.toHexString(),
        name: mockTeams[0].name,
        userIds: mockTeams[0].userIds.map(id => id.toHexString())
      })
      expect(fetched.items[1]).to.deep.include({
        id: mockTeams[1]._id?.toHexString(),
        name: mockTeams[1].name,
        userIds: mockTeams[1].userIds.map(id => id.toHexString())
      })
    })

    it('find all teams for page 1 without members', async function() {
      const parameters: TeamFindParameters = {
        pageSize: 4,
        pageIndex: 0,
        withoutMembers: [mockUser1Id.toHexString()]
      }
      const fetched = await repository.find(parameters)
      expect(fetched.totalCount).to.equal(2)
      expect(fetched.pageIndex).to.equal(0)
      expect(fetched.pageSize).to.equal(4)
      expect(fetched.items[0]).to.deep.include({
        id: mockTeams[2]._id?.toHexString(),
        name: mockTeams[2].name,
        userIds: mockTeams[2].userIds.map(id => id.toHexString())
      })
      expect(fetched.items[1]).to.deep.include({
        id: mockTeams[3]._id?.toHexString(),
        name: mockTeams[3].name,
        userIds: mockTeams[3].userIds.map(id => id.toHexString())
      })
    })
  })
})
