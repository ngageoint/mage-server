
// list observations in event
// read observation by id
// favorite an observation
// unfavorite an observation
// mark observation as important
// unmark observation as important
// transition observation state to archived
// transition observation state to active

import { expect } from 'chai'
import { MageClientSession, SignInResult } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as Fixture from './fixture'


describe('observations', function () {

  let stack: ChildProcessTestStackRef
  let rootSession: MageClientSession
  let fixture: Fixture.ObservationFixture

  this.timeout(15000)

  before('initialize stack', async function () {
    stack = await launchTestStack('observations')
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

  it('lists observations in event', async function () {
    const observations = await rootSession.readObservations(fixture.event.id)

    expect(observations).to.be.an('array').with.length.greaterThan(0)
    const found = observations.find(o => o.id === fixture.observation.id)
    expect(found, 'fixture observation not in list').to.exist
  })

  it('reads observation by id', async function () {
    const obs = await rootSession.readObservation(fixture.event.id, fixture.observation.id)

    expect(obs.id).to.equal(fixture.observation.id)
    expect(obs.eventId).to.equal(fixture.event.id)
    expect(obs.geometry.type).to.equal('Point')
  })

  it('favorites and unfavorites an observation', async function () {
    const { event, observation } = fixture

    const favorited = await rootSession.favoriteObservation(event.id, observation.id).then(x => x.data)
    expect(favorited.favoriteUserIds).to.include(rootSession.user!.id)

    const unfavorited = await rootSession.unfavoriteObservation(event.id, observation.id).then(x => x.data)
    expect(unfavorited.favoriteUserIds).not.to.include(rootSession.user!.id)
  })

  it('marks and unmarks an observation as important', async function () {
    const { event, observation } = fixture
    const description = 'High priority incident'

    const marked = await rootSession.markImportant(event.id, observation.id, description).then(x => x.data)
    expect(marked.important).to.exist
    expect(marked.important!.description).to.equal(description)

    const unmarked = await rootSession.unmarkImportant(event.id, observation.id).then(x => x.data)
    expect(unmarked.important).not.to.exist
  })

  it('adds observation state transitions', async function () {
    const { event, observation } = fixture

    const archived = await rootSession.addObservationState(event.id, observation.id, 'archive').then(x => x.data)
    expect(archived.name).to.equal('archive')

    const reactivated = await rootSession.addObservationState(event.id, observation.id, 'active').then(x => x.data)
    expect(reactivated.name).to.equal('active')
  })
})
