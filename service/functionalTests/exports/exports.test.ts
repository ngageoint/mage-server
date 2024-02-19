import { expect } from 'chai'
import { ExportInfo, ExportFormat, MageClientSession, ExportStatus, SignInResult } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import * as Fixture from './fixture'


describe('exports', function() {

  let stack: ChildProcessTestStackRef
  let rootSession: MageClientSession
  let fixture: Fixture.ExportTestFixture

  this.timeout(15000)

  before('initialize stack', async function() {
    stack = await launchTestStack('exports')
  })

  before('initialize fixture data', async function() {

    rootSession = new MageClientSession(stack.mageUrl)
    const rootSetup = await rootSession.setupRootUser(Fixture.rootSeed).then(x => x.data)

    expect(rootSetup.user.username, 'unexpected root user').to.equal(Fixture.rootSeed.username)
    expect(rootSetup.device.uid, 'unexpected root device').to.equal(Fixture.rootSeed.uid)

    const rootSignIn = await rootSession.signIn(Fixture.rootSeed.username, Fixture.rootSeed.password, Fixture.rootSeed.uid) as SignInResult

    expect(rootSignIn.user).to.exist
    expect(rootSignIn.user.username).to.equal(Fixture.rootSeed.username)

    fixture = await Fixture.populateFixtureData(stack, rootSession)
  })

  after('stop stack', async function() {
    await stack.stop()
  })

  it('exports geopackage', async function() {

    const pendingExport = await rootSession.startExport(
      fixture.event.id,
      {
        exportType: ExportFormat.GeoPackage,
        observations: true,
        locations: true,
        attachments: false,
      }
    )
    const finishedExport = await rootSession.waitForMyExport(pendingExport.id) as ExportInfo

    expect(finishedExport instanceof Error, 'geopackage export error').to.be.false
    expect(finishedExport.status).to.equal(ExportStatus.Completed, 'geopackage export incomplete')
  })

  it('exports kml', async function() {

    const pendingExport = await rootSession.startExport(
      fixture.event.id,
      {
        exportType: ExportFormat.KML,
        observations: true,
        locations: true,
        attachments: false,
      }
    )
    const finishedExport = await rootSession.waitForMyExport(pendingExport.id) as ExportInfo

    expect(finishedExport instanceof Error, 'kml export error').to.be.false
    expect(finishedExport.status).to.equal(ExportStatus.Completed, 'geopackage export incomplete')
  })

  it('exports csv', async function() {

    const pendingExport = await rootSession.startExport(
      fixture.event.id,
      {
        exportType: ExportFormat.CSV,
        observations: true,
        locations: true,
        attachments: false,
      }
    )
    const finishedExport = await rootSession.waitForMyExport(pendingExport.id) as ExportInfo

    expect(finishedExport instanceof Error, 'csv export error').to.be.false
    expect(finishedExport.status).to.equal(ExportStatus.Completed, 'geopackage export incomplete')
  })

  it('exports geojson', async function() {

    const pendingExport = await rootSession.startExport(
      fixture.event.id,
      {
        exportType: ExportFormat.GeoJSON,
        observations: true,
        locations: true,
        attachments: false,
      }
    )
    const finishedExport = await rootSession.waitForMyExport(pendingExport.id) as ExportInfo

    expect(finishedExport instanceof Error, 'geojson export error').to.be.false
    expect(finishedExport.status).to.equal(ExportStatus.Completed, 'geopackage export incomplete')
  })
})