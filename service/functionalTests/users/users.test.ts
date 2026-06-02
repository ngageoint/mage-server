
// list all users
// get user by id
// update user display name
// get myself
// update myself
// delete a user

import { expect } from 'chai'
import { MageClientSession, SignInResult } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as Fixture from './fixture'


describe('users', function () {

  let stack: ChildProcessTestStackRef
  let rootSession: MageClientSession
  let fixture: Fixture.UsersFixture

  this.timeout(15000)

  before('initialize stack', async function () {
    stack = await launchTestStack('users')
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

  it('lists all users', async function () {
    const users = await rootSession.listUsers().then(x => x.data)

    expect(users).to.be.an('array').with.length(2)
    const usernames = users.map(u => u.username)
    expect(usernames).to.include(Fixture.rootSeed.username)
    expect(usernames).to.include(Fixture.userSeed.username)
  })

  it('gets a user by id', async function () {
    const user = await rootSession.getUser(fixture.additionalUser.id).then(x => x.data)

    expect(user.id).to.equal(fixture.additionalUser.id)
    expect(user.username).to.equal(Fixture.userSeed.username)
    expect(user.displayName).to.equal(Fixture.userSeed.displayName)
  })

  it('updates a user display name', async function () {
    const updated = await rootSession.updateUser(fixture.additionalUser.id, { displayName: 'Updated Display Name' }).then(x => x.data)

    expect(updated.displayName).to.equal('Updated Display Name')

    const fetched = await rootSession.getUser(fixture.additionalUser.id).then(x => x.data)
    expect(fetched.displayName).to.equal('Updated Display Name')
  })

  it('gets myself', async function () {
    const myself = await rootSession.getMyself().then(x => x.data)

    expect(myself.username).to.equal(Fixture.rootSeed.username)
    expect(myself.id).to.equal(rootSession.user!.id)
  })

  it('updates myself', async function () {
    const newDisplayName = 'Updated Root Display'
    const updated = await rootSession.updateMyself({ displayName: newDisplayName }).then(x => x.data)

    expect(updated.displayName).to.equal(newDisplayName)

    const fetched = await rootSession.getMyself().then(x => x.data)
    expect(fetched.displayName).to.equal(newDisplayName)
  })

  it('deletes a user', async function () {
    const deleteRes = await rootSession.deleteUser(fixture.additionalUser.id)
    expect(deleteRes.status).to.equal(204)

    const notFound = await rootSession.http.get(`/api/users/${fixture.additionalUser.id}`, {
      validateStatus: () => true,
    })
    expect(notFound.status).to.equal(404)
  })
})
