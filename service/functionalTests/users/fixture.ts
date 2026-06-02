
import { expect } from 'chai'
import {
  MageClientSession,
  RootUserSetupRequest,
  UserCreateRequest,
  User,
} from '../client'

export const rootSeed: RootUserSetupRequest = {
  username: 'users.root',
  displayName: 'Users Root',
  password: 'users.root.secret',
  uid: 'users.root.device',
}

export const userSeed: Omit<UserCreateRequest, 'roleId'> = {
  username: 'users.testuser',
  displayName: 'Test User',
  password: 'testuser.secret_password',
  email: 'testuser@example.com',
}

export interface UsersFixture {
  additionalUser: User
}

export async function populateFixtureData(rootSession: MageClientSession): Promise<UsersFixture> {

  const roles = await rootSession.listRoles().then(x => x.data)
  const userRole = roles.find(x => x.name === 'USER_ROLE')!

  expect(userRole, 'failed to find user role').to.exist

  const additionalUser = await rootSession.createUser({
    ...userSeed,
    roleId: userRole.id,
  }).then(x => x.data)

  expect(additionalUser.id, 'additional user missing id').to.be.a('string')
  expect(additionalUser.username).to.equal(userSeed.username)

  return { additionalUser }
}
