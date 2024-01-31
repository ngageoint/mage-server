import { expect } from 'chai'
import { MageClientSession } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as fixture from './fixture'


describe('exports', function() {

  let stack: ChildProcessTestStackRef

  this.timeout(15000)

  before('initialize stack', async function() {
    stack = await launchTestStack('exports')
  })

  before('initialize fixture data', async function() {

    const rootSession = new MageClientSession(stack.mageUrl)
    const rootSetup = await rootSession.setupRootUser(fixture.rootSeed).then(x => x.data)

    expect(rootSetup.user.username, 'unexpected root user').to.equal(fixture.rootSeed.username)
    expect(rootSetup.device.uid, 'unexpected root device').to.equal(fixture.rootSeed.uid)

    const signInError = await rootSession.signIn(fixture.rootSeed.username, fixture.rootSeed.password, fixture.rootSeed.uid)

    expect(signInError).to.not.exist

    const fixtureData = await fixture.populateFixtureData(rootSession)
  })

  after('stop stack', async function() {
    await stack.stop()
  })

  it('exports geopackage', async function() {

  })

  it('exports kml', async function() {

  })

  it('exports csv', async function() {

  })

  it('exports geojson')
})