
// list teams
// get team by id
// update team name
// add team member
// remove team member
// delete a team

import { expect } from 'chai'
import { MageClientSession, SignInResult } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as Fixture from './fixture'


describe('teams', function () {

  let stack: ChildProcessTestStackRef
  let rootSession: MageClientSession
  let fixture: Fixture.TeamsFixture

  this.timeout(15000)

  before('initialize stack', async function () {
    stack = await launchTestStack('teams')
  })

  before('initialize fixture data', async function () {

    rootSession = new MageClientSession(stack.mageUrl)
    const rootSetup = await rootSession.setupRootUser(Fixture.rootSeed).then(x => x.data)

    expect(rootSetup.user.username).to.equal(Fixture.rootSeed.username)
    expect(rootSetup.device.uid).to.equal(Fixture.rootSeed.uid)

    const rootSignIn = await rootSession.signIn(Fixture.rootSeed.username, Fixture.rootSeed.password, Fixture.rootSeed.uid) as SignInResult

    expect(rootSignIn.user).to.exist
    expect(rootSignIn.user.username).to.equal(Fixture.rootSeed.username)

    fixture = await Fixture.populateFixtureData(rootSession)
  })

  after('stop stack', async function () {
    await stack.stop()
  })

  it('lists teams including the fixture team', async function () {
    const teams = await rootSession.listTeams().then(x => x.data)

    expect(teams).to.be.an('array')
    const found = teams.find(t => t.id === fixture.team.id)
    expect(found, 'fixture team not in list').to.exist
    expect(found!.name).to.equal(Fixture.teamSeed.name)
  })

  it('gets a team by id', async function () {
    const team = await rootSession.getTeam(fixture.team.id).then(x => x.data)

    expect(team.id).to.equal(fixture.team.id)
    expect(team.name).to.equal(Fixture.teamSeed.name)
    expect(team.description).to.equal(Fixture.teamSeed.description)
  })

  it('updates a team name', async function () {
    const updated = await rootSession.updateTeam(fixture.team.id, { name: 'Renamed Team' }).then(x => x.data)

    expect(updated.name).to.equal('Renamed Team')

    const fetched = await rootSession.getTeam(fixture.team.id).then(x => x.data)
    expect(fetched.name).to.equal('Renamed Team')
  })

  it('adds and removes a team member', async function () {
    const { team, additionalUser } = fixture

    await rootSession.addTeamMember(team.id, additionalUser.id)
    const afterAdd = await rootSession.getTeam(team.id).then(x => x.data) as any
    const memberIdsAfterAdd: string[] = (afterAdd.users ?? afterAdd.userIds ?? []).map((u: any) => u.id ?? u)
    expect(memberIdsAfterAdd).to.include(additionalUser.id)

    await rootSession.removeTeamMember(team.id, additionalUser.id)
    const afterRemove = await rootSession.getTeam(team.id).then(x => x.data) as any
    const memberIdsAfterRemove: string[] = (afterRemove.users ?? afterRemove.userIds ?? []).map((u: any) => u.id ?? u)
    expect(memberIdsAfterRemove).not.to.include(additionalUser.id)
  })

  it('deletes a team', async function () {
    const deleted = await rootSession.deleteTeam(fixture.team.id).then(x => x.data)

    expect(deleted.id).to.equal(fixture.team.id)

    const notFound = await rootSession.http.get(`/api/teams/${fixture.team.id}`, {
      validateStatus: () => true,
    })
    expect(notFound.status).to.equal(404)
  })
})
