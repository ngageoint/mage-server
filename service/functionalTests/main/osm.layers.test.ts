import { expect } from 'chai'
import axios from 'axios'
import { MageClientSession, SignInResult, MageEventPopulated } from '../client'
import { ChildProcessTestStackRef, launchTestStack } from '../stack'
import { exportGeoPackage } from '../../src/utilities/osm-geopackage'
import { ATTRIBUTION } from '../../src/utilities/osm-search'

describe('OSM exports through existing layer storage and team permissions', function () {
  this.timeout(60000)
  let stack: ChildProcessTestStackRef
  let admin: MageClientSession, member: MageClientSession, outsider: MageClientSession
  let event: MageEventPopulated
  let layerId: number
  let buffer: Buffer
  const bounds = { south: 38.12, west: -77.13, north: 38.13, east: -77.12 }

  before(async function () {
    stack = await launchTestStack('osm-layers')
    admin = new MageClientSession(stack.mageUrl)
    const seed = { username: 'osm.root', displayName: 'OSM Root', password: 'isolated.osm.root.password', uid: 'osm.root.device' }
    await admin.setupRootUser(seed)
    expect(await admin.signIn(seed.username, seed.password, seed.uid)).not.to.be.instanceOf(Error)
    const roles = (await admin.listRoles()).data
    async function provision(username: string): Promise<MageClientSession> {
      const role = roles.find(r => r.name === 'USER_ROLE')!
      const password = 'isolated.osm.member.password'
      const user = (await admin.createUser({ username, displayName: username, password, roleId: role.id })).data
      const uid = `${username}.device`
      await admin.createDevice({ uid, userId: user.id })
      const client = new MageClientSession(stack.mageUrl)
      expect(await client.signIn(username, password, uid) as SignInResult).not.to.be.instanceOf(Error)
      return client
    }
    member = await provision('osm.member')
    outsider = await provision('osm.outsider')
    const created = (await admin.createEvent({ name: 'OSM layer team fixture', style: {} })).data
    event = (await admin.readEvent(created.id)).data
    await admin.addParticipantToEvent(event, member.user!.id)
    buffer = await exportGeoPackage([{
      type: 'Feature', id: 'node/1', geometry: { type: 'Point', coordinates: [-77.125, 38.125] },
      properties: { osm_id: '1', osm_type: 'node', name: 'OSM test hospital', tags: '{"amenity":"hospital"}',
        source: 'https://www.openstreetmap.org/node/1', attribution: ATTRIBUTION }
    }])
  })

  after(async function () { if (stack) await stack.stop() })

  it('requires real authentication on new routes and validates bounds before contacting Overpass', async function () {
    for (const route of ['search', 'export']) {
      const response = await axios.post(`${stack.mageUrl}/api/osm/${route}`, {}, { validateStatus: () => true })
      expect(response.status).to.equal(401)
    }
    const invalid = await member.http.post('/api/osm/search', { bounds: { ...bounds, north: 80 }, search: 'hospital' },
      { validateStatus: () => true })
    expect(invalid.status).to.equal(422)
    expect(invalid.data.message).to.include('Zoom in')
    const noSelection = await member.http.post('/api/osm/export', { searchId: 'unknown', ids: ['node/1'] },
      { validateStatus: () => true })
    expect(noSelection.status).to.equal(410)
  })

  it('does not let a regular map user upload or share layers', async function () {
    const upload = await member.http.post('/api/layers', { name: 'forbidden OSM', type: 'GeoPackage' },
      { validateStatus: () => true })
    expect(upload.status).to.equal(403)
    const share = await member.http.post(`/api/events/${event.id}/layers`, { id: 1 }, { validateStatus: () => true })
    expect(share.status).to.equal(403)
  })

  it('uploads a real exported GeoPackage through the standard layer route and processes it', async function () {
    const form = new FormData()
    form.set('name', 'OSM exported fixture')
    form.set('type', 'GeoPackage')
    form.set('description', ATTRIBUTION)
    form.set('geopackage', new Blob([new Uint8Array(buffer)], { type: 'application/geopackage+sqlite3' }), 'osm-search.gpkg')
    const response = await admin.http.postForm('/api/layers', form)
    layerId = response.data.id
    expect(layerId).to.exist
    expect(response.data.invalid).not.to.exist
    for (let i = 0; i < 100; i++) {
      const layer = (await admin.http.get(`/api/layers/${layerId}`)).data
      if (layer.state === 'available') {
        expect(layer.tables[0].name).to.equal('osm_features')
        expect(layer.tables[0].bbox[0]).to.equal(-77.125)
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('OSM GeoPackage did not become available')
  })

  it('shares only with the event and renders a tile for a permitted teammate', async function () {
    await admin.http.post(`/api/events/${event.id}/layers`, { id: layerId })
    const listed = (await member.http.get(`/api/events/${event.id}/layers`)).data
    expect(listed.map((layer: any) => layer.id)).to.include(layerId)
    const denied = await outsider.http.get(`/api/events/${event.id}/layers`, { validateStatus: () => true })
    expect(denied.status).to.equal(403)
    const downloaded = await member.http.get(`/api/events/${event.id}/layers/${layerId}`, { responseType: 'arraybuffer',
      headers: { Accept: 'application/geopackage+sqlite3' } })
    expect(Buffer.from(downloaded.data).subarray(0, 15).toString()).to.equal('SQLite format 3')
    const z = 14
    const x = Math.floor((-77.125 + 180) / 360 * (1 << z))
    const y = Math.floor((1 - Math.asinh(Math.tan(38.125 * Math.PI / 180)) / Math.PI) / 2 * (1 << z))
    const tile = await member.http.get(`/api/events/${event.id}/layers/${layerId}/osm_features/${z}/${x}/${y}.png`,
      { responseType: 'arraybuffer' })
    expect(tile.headers['content-type']).to.include('image/png')
    expect(Buffer.from(tile.data).subarray(1, 4).toString()).to.equal('PNG')
  })
})
