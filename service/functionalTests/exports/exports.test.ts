import { expect } from 'chai'
import { MageClientSession } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as fixture from './fixture'


async function waitForExport(): Promise<any> {

}

describe('exports', function() {

  let stack: ChildProcessTestStackRef

  this.timeout(15000)

  before('initialize stack', async function() {
    stack = await launchTestStack('exports')
  })

  before('initialize fixture data', async function() {

    const rootSession = new MageClientSession(stack.mageUrl)
    await fixture.createFixtureData(rootSession)
    const signInError = await rootSession.signIn(fixture.rootSeed.username, fixture.rootSeed.password, fixture.rootSeed.uid)

    expect(signInError).to.not.exist
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