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
    const setupRes = await rootSession.setupRootUser(fixture.root)
    const initRoot = setupRes.data

    expect(setupRes.status).to.equal(200)
    expect(initRoot.user.username).to.equal(fixture.root.username)
    expect(initRoot.device.uid).to.equal(fixture.root.uid)

    const signInError = await rootSession.signIn(fixture.root.username, fixture.root.password, fixture.root.uid)

    expect(signInError).to.not.exist
  })

  after('stop stack', async function() {
    await stack.stop()
  })

  it('exports geopackage', async function() {

  })
})