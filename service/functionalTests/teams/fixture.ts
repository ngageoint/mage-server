
import { expect } from 'chai'
import {
  MageClientSession,
  RootUserSetupRequest,
  UserCreateRequest,
  User,
  Team,
  TeamCreateRequest,
} from '../client'

export const rootSeed: RootUserSetupRequest = {
  username: 'teams.root',
  displayName: 'Teams Root',
  password: 'teams.root.secret',
  uid: 'teams.root.device',
}

export const userSeed: Omit<UserCreateRequest, 'roleId'> = {
  username: 'teams.testuser',
  displayName: 'Teams Test User',
  password: 'testuser.secret_password',
}

export const teamSeed: TeamCreateRequest = {
  name: 'Fixture Team',
  description: 'Created by functional test fixture',
}

export interface TeamsFixture {
  additionalUser: User
  team: Team
}

export async function populateFixtureData(rootSession: MageClientSession): Promise<TeamsFixture> {

  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!

  expect(userRole, 'failed to find user role').to.exist

  const additionalUser = await rootSession.createUser({
    ...userSeed,
    roleId: userRole.id,
  }).then(x => x.data)

  expect(additionalUser.id, 'additional user missing id').to.be.a('string')

  const team = await rootSession.createTeam(teamSeed).then(x => x.data)

  expect(team.id, 'team missing id').to.be.a('string')
  expect(team.name).to.equal(teamSeed.name)

  return { additionalUser, team }
}
